// Package grpcsrv implements the mTLS NodeControl service: node enrollment,
// config streaming (<1s push target, NFR-1.2) and heartbeat ingestion.
package grpcsrv

import (
	"context"
	"io"
	"log"
	"time"

	"corazium/controlplane/gen/v1"
	"corazium/controlplane/internal/store"
)

type Server struct {
	v1.UnimplementedNodeControlServer
	Store *store.Store
	// Subscribers receive a ping on every config version bump.
	notify chan string
}

func New(s *store.Store) *Server {
	return &Server{Store: s, notify: make(chan string, 64)}
}

// NotifyConfigUpdate wakes all streaming nodes after a policy mutation.
// The REST layer calls this (best-effort, non-blocking).
func (srv *Server) NotifyConfigUpdate() {
	select {
	case srv.notify <- srv.Store.ConfigVersion:
	default:
	}
}

func (srv *Server) Register(ctx context.Context, req *v1.RegisterRequest) (*v1.RegisterResponse, error) {
	node := &store.CorazaNode{
		ID:         req.NodeId,
		NodeName:   req.Hostname,
		Hostname:   req.Hostname,
		IPAddress:  req.IpAddress,
		Version:    req.CorazaVersion,
		CRSVersion: req.CrsVersion,
		Status:     store.NodeOnline,
	}
	srv.Store.UpsertNode(node)
	log.Printf("[grpc] node registered: %s (%s)", req.NodeId, req.IpAddress)
	return &v1.RegisterResponse{
		Accepted:      true,
		ConfigVersion: srv.Store.ConfigVersion,
		SeclangBundle: srv.Store.SecLangBundle(),
	}, nil
}

// StreamConfigs: node streams acks, control plane streams config updates.
func (srv *Server) StreamConfigs(stream v1.NodeControl_StreamConfigsServer) error {
	current := srv.Store.ConfigVersion

	// Send current config immediately so late joiners converge.
	if err := srv.sendUpdate(stream, current); err != nil {
		return err
	}

	errCh := make(chan error, 1)
	go func() {
		for {
			ack, err := stream.Recv()
			if err != nil {
				errCh <- err
				return
			}
			log.Printf("[grpc] config ack: node=%s ver=%s applied=%v", ack.NodeId, ack.ConfigVersion, ack.Applied)
			srv.Store.MarkSynced(ack.NodeId, ack.ConfigVersion)
		}
	}()

	for {
		select {
		case ver := <-srv.notify:
			if ver != current {
				current = ver
				if err := srv.sendUpdate(stream, current); err != nil {
					return err
				}
			}
		case err := <-errCh:
			if err == io.EOF {
				return nil
			}
			return err
		case <-stream.Context().Done():
			return nil
		}
	}
}

func (srv *Server) sendUpdate(stream v1.NodeControl_StreamConfigsServer, version string) error {
	bundle := srv.Store.SecLangBundle()
	var toggles []*v1.CrsToggle
	for _, c := range srv.Store.ListCrsCategories() {
		toggles = append(toggles, &v1.CrsToggle{RulePrefix: c.RulePrefix, Enabled: c.Enabled})
	}
	pl, in, out := srv.Store.DefaultPolicy()
	return stream.Send(&v1.ConfigUpdate{
		ConfigVersion:     version,
		SeclangBundle:     bundle,
		CrsToggles:        toggles,
		ParanoiaLevel:     int32(pl),
		InboundThreshold:  int32(in),
		OutboundThreshold: int32(out),
	})
}

func (srv *Server) Heartbeat(stream v1.NodeControl_HeartbeatServer) error {
	for {
		hb, err := stream.Recv()
		if err != nil {
			if err == io.EOF {
				return nil
			}
			return err
		}
		desired, ok := srv.Store.Heartbeat(hb.NodeId, hb.CpuPct, hb.MemPct, hb.Rps, hb.LatencyMs, hb.CurrentConfigVersion)
		if !ok {
			// Unknown node: enroll implicitly so data-plane agents self-register.
			srv.Store.UpsertNode(&store.CorazaNode{
				ID: hb.NodeId, NodeName: hb.NodeId, Status: store.NodeOnline,
				LastHeartbeat: time.Now().UTC().Format(time.RFC3339),
			})
			desired = srv.Store.ConfigVersion
		}
		if desired != "" {
			if err := stream.Send(&v1.HeartbeatResponse{Ok: true, DesiredConfigVersion: desired}); err != nil {
				return err
			}
		}
	}
}
