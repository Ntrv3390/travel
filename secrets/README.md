# GTTD SSH Keys

This directory contains SSH private keys for authenticating with Google Things to Do SFTP endpoints.

## Setup Instructions

### 1. Generate SSH Key Pair

```bash
# Generate development key
ssh-keygen -t ed25519 -C "traviia-gttd-sftp-dev" -f ./gttd_dev_ssh_key -N ""

# Generate production key
ssh-keygen -t ed25519 -C "traviia-gttd-sftp-prod" -f ./gttd_prod_ssh_key -N ""
```

### 2. Send Public Keys to Google

Send the public keys (`.pub` files) to your Google Things to Do Technical Account Manager:

```bash
cat gttd_dev_ssh_key.pub
cat gttd_prod_ssh_key.pub
```

### 3. Permissions

Ensure proper file permissions:

```bash
chmod 600 gttd_dev_ssh_key
chmod 600 gttd_prod_ssh_key
```

### 4. Keep Private Keys Secure

- **NEVER** commit private keys to version control
- Store backups in a secure location
- Use Docker secrets for production deployments
- Rotate keys regularly

## Notes

- `gttd_dev_ssh_key` — For testing with sftp-dev.things-to-do.google.com
- `gttd_prod_ssh_key` — For production with sftp.things-to-do.google.com
- Both keys should be Ed25519 keys (modern, secure, and smaller)
- Keep `.gitignore` configured to exclude these files

## Docker Secrets

Docker Compose uses Docker secrets to securely pass these keys to the container:

```yaml
secrets:
  gttd_dev_ssh_key:
    file: ./secrets/gttd_dev_ssh_key
  gttd_prod_ssh_key:
    file: ./secrets/gttd_prod_ssh_key
```

The keys are mounted at `/run/secrets/gttd_dev_ssh_key` and `/run/secrets/gttd_prod_ssh_key` inside the container.
