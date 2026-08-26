// Package auth: stateless HMAC-signed session tokens + password hashing.
// Default admin is provisioned on first boot (admin@corazium.io / admin123 —
// change it from the Profile settings page).
package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"corazium/controlplane/internal/store"
)

const tokenTTL = 24 * time.Hour

func secret() []byte {
	if s := os.Getenv("AUTH_SECRET"); s != "" {
		return []byte(s)
	}
	return []byte("corazium-dev-secret") // ponytail: set AUTH_SECRET in production
}

// EnsureDefaultAdmin provisions the bootstrap account if no users exist.
func EnsureDefaultAdmin(ctx context.Context, st *store.Store) {
	if _, err := st.GetUserByEmail("admin@corazium.io"); err == nil {
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	_, err := st.CreateUser(&store.User{
		Email: "admin@corazium.io", Name: "Administrator", Role: "Admin",
		PasswordHash: string(hash),
	})
	if err != nil {
		log.Printf("[auth] default admin provisioning: %v", err)
		return
	}
	log.Println("[auth] default admin created: admin@corazium.io / admin123 (change it!)")
}

// Login verifies credentials and returns a signed token + user.
func Login(st *store.Store, email, password string) (string, *store.User, error) {
	u, err := st.GetUserByEmail(strings.ToLower(strings.TrimSpace(email)))
	if err != nil {
		return "", nil, fmt.Errorf("invalid credentials")
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) != nil {
		return "", nil, fmt.Errorf("invalid credentials")
	}
	return signToken(u.Email), u, nil
}

func signToken(email string) string {
	exp := time.Now().Add(tokenTTL).Unix()
	payload := fmt.Sprintf("%s|%d", email, exp)
	mac := hmac.New(sha256.New, secret())
	mac.Write([]byte(payload))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return fmt.Sprintf("%s|%s", base64.RawURLEncoding.EncodeToString([]byte(payload)), sig)
}

// VerifyToken validates a token and returns the email it was issued for.
func VerifyToken(token string) (string, error) {
	parts := strings.SplitN(token, "|", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("malformed token")
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return "", fmt.Errorf("malformed token")
	}
	mac := hmac.New(sha256.New, secret())
	mac.Write(raw)
	want := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(want), []byte(parts[1])) {
		return "", fmt.Errorf("invalid signature")
	}
	fields := strings.SplitN(string(raw), "|", 2)
	if len(fields) != 2 {
		return "", fmt.Errorf("malformed token")
	}
	var exp int64
	if _, err := fmt.Sscanf(fields[1], "%d", &exp); err != nil || time.Now().Unix() > exp {
		return "", fmt.Errorf("token expired")
	}
	return fields[0], nil
}

// HashPassword hashes a plaintext password for storage.
func HashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(b), err
}

// RandomToken is used for misc secret material if needed.
func RandomToken() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

// CheckPassword compares a plaintext password against a stored hash.
func CheckPassword(hash, pw string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw))
}

// SignToken re-issues a token for an existing account (e.g. after email change).
func SignToken(email string) string { return signToken(email) }