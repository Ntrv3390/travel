package gttd

import (
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"time"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

type SFTPConfig struct {
	Host       string // e.g., "sftp.things-to-do.google.com"
	Port       int    // usually 22
	Username   string
	PrivateKey []byte // PEM-encoded private key
	RemoteDir  string // remote directory path provided by Google
}

type SFTPUploader struct {
	config SFTPConfig
}

// NewSFTPUploader creates a new SFTP uploader
func NewSFTPUploader(config SFTPConfig) *SFTPUploader {
	return &SFTPUploader{config: config}
}

// Upload uploads all provided local file paths to the configured SFTP endpoint
func (u *SFTPUploader) Upload(localFilePaths []string) error {
	if len(localFilePaths) == 0 {
		return fmt.Errorf("no files to upload")
	}

	// Parse private key
	signer, err := ssh.ParsePrivateKey(u.config.PrivateKey)
	if err != nil {
		return fmt.Errorf("parse private key: %w", err)
	}

	// Configure SSH client
	sshConfig := &ssh.ClientConfig{
		User: u.config.Username,
		Auth: []ssh.AuthMethod{
			ssh.PublicKeys(signer),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(), // TODO: Replace with known_hosts in production
		Timeout:         30 * time.Second,
	}

	addr := net.JoinHostPort(u.config.Host, fmt.Sprintf("%d", u.config.Port))
	sshClient, err := ssh.Dial("tcp", addr, sshConfig)
	if err != nil {
		return fmt.Errorf("ssh dial %s: %w", addr, err)
	}
	defer sshClient.Close()

	sftpClient, err := sftp.NewClient(sshClient)
	if err != nil {
		return fmt.Errorf("sftp client: %w", err)
	}
	defer sftpClient.Close()

	// Upload each file
	for _, localPath := range localFilePaths {
		if err := u.uploadFile(sftpClient, localPath); err != nil {
			return fmt.Errorf("upload %s: %w", localPath, err)
		}
	}

	return nil
}

func (u *SFTPUploader) uploadFile(client *sftp.Client, localPath string) error {
	localFile, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("open local file: %w", err)
	}
	defer localFile.Close()

	remotePath := filepath.Join(u.config.RemoteDir, filepath.Base(localPath))

	remoteFile, err := client.Create(remotePath)
	if err != nil {
		return fmt.Errorf("create remote file %s: %w", remotePath, err)
	}
	defer remoteFile.Close()

	if _, err := io.Copy(remoteFile, localFile); err != nil {
		return fmt.Errorf("copy to remote: %w", err)
	}

	return nil
}
