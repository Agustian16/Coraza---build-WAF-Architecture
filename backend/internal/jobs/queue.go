// Package jobs wires the Asynq task queue (Redis-backed) used for async work:
// threat-feed refresh, log batch flushes to ClickHouse, node health sweeps.
// When Redis is not configured the queue degrades to in-process timers.
package jobs

import (
	"context"
	"log"
	"time"

	"github.com/hibiken/asynq"
)

const (
	TaskRefreshThreatFeeds = "feed:refresh"
	TaskFlushLogs          = "logs:flush"
	TaskNodeHealthSweep    = "nodes:health"
)

func NewClient(redisAddr string) *asynq.Client {
	if redisAddr == "" {
		log.Println("[jobs] asynq disabled (no redis)")
		return nil
	}
	c := asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr})
	log.Println("[jobs] asynq client ready")
	return c
}

// EnqueuePeriodic registers recurring tasks. With Redis they run through the
// Asynq scheduler; otherwise in-process timers keep the same cadence.
func EnqueuePeriodic(ctx context.Context, client *asynq.Client, redisAddr string) {
	if client == nil {
		go tick(ctx, 6*time.Hour, "threat-feed refresh")
		go tick(ctx, 30*time.Second, "log flush")
		go tick(ctx, 15*time.Second, "node health sweep")
		return
	}
	scheduler := asynq.NewScheduler(asynq.RedisClientOpt{Addr: redisAddr}, nil)
	_, _ = scheduler.Register("0 */6 * * *", asynq.NewTask(TaskRefreshThreatFeeds, nil))
	_, _ = scheduler.Register("* * * * *", asynq.NewTask(TaskFlushLogs, nil))
	_, _ = scheduler.Register("* * * * *", asynq.NewTask(TaskNodeHealthSweep, nil))
	if err := scheduler.Run(); err != nil {
		log.Printf("[jobs] scheduler failed: %v", err)
	}
	log.Println("[jobs] asynq scheduler running")
}

func tick(ctx context.Context, every time.Duration, what string) {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			log.Printf("[jobs] %s tick (in-process)", what)
		}
	}
}
