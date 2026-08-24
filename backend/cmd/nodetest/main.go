// Simulation edge-node client: exercises Register → Heartbeat → StreamConfigs
// against the control plane. Usage: nodetest [addr]
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	v1 "corazium/controlplane/gen/v1"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	addr := "localhost:9090"
	if len(os.Args) > 1 {
		addr = os.Args[1]
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("dial: %v", err)
	}
	defer conn.Close()
	client := v1.NewNodeControlClient(conn)

	// 1) Register
	reg, err := client.Register(ctx, &v1.RegisterRequest{
		NodeId: "edge-test-01", Hostname: "10.10.9.9", IpAddress: "10.10.9.9",
		CorazaVersion: "coraza/v3.3.2", CrsVersion: "CRS v4.0.0",
	})
	if err != nil {
		log.Fatalf("register: %v", err)
	}
	fmt.Printf("REGISTER  accepted=%v config=%s bundle=%d bytes\n",
		reg.Accepted, reg.ConfigVersion, len(reg.SeclangBundle))

	// 2) StreamConfigs: receive the initial config push, ack it
	cfgStream, err := client.StreamConfigs(ctx)
	if err != nil {
		log.Fatalf("stream: %v", err)
	}
	upd, err := cfgStream.Recv()
	if err != nil {
		log.Fatalf("config recv: %v", err)
	}
	fmt.Printf("CONFIG    ver=%s toggles=%d paranoia=%d inbound=%d outbound=%d bundle=%d bytes\n",
		upd.ConfigVersion, len(upd.CrsToggles), upd.ParanoiaLevel, upd.InboundThreshold, upd.OutboundThreshold, len(upd.SeclangBundle))
	if err := cfgStream.Send(&v1.ConfigAck{NodeId: "edge-test-01", ConfigVersion: upd.ConfigVersion, Applied: true}); err != nil {
		log.Fatalf("ack: %v", err)
	}
	fmt.Println("ACK       sent")

	// 3) Heartbeat with stale version -> control plane must answer desired ver
	hbStream, err := client.Heartbeat(ctx)
	if err != nil {
		log.Fatalf("heartbeat: %v", err)
	}
	_ = hbStream.Send(&v1.HeartbeatRequest{
		NodeId: "edge-test-01", CpuPct: 21, MemPct: 44, Rps: 900, LatencyMs: 1.1,
		CurrentConfigVersion: "v001", UnixTs: time.Now().Unix(),
	})
	resp, err := hbStream.Recv()
	if err != nil {
		log.Fatalf("heartbeat recv: %v", err)
	}
	fmt.Printf("HEARTBEAT ok=%v desired=%q\n", resp.Ok, resp.DesiredConfigVersion)

	fmt.Println("DONE      gRPC flow verified (Register → ConfigStream → Ack → Heartbeat)")
}
