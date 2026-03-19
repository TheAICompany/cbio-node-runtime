# TODO: Multi-Vault Management

TUI startup flow: list vaults first, then select or create. No direct key prompt at start.

## Core Flow

1. **Startup**: Scan `C_BIO_VAULT_DIR` (default `~/.c-bio/`) for `vault_*.enc`
2. **List**: Show all vault files with full path; add "Create vault" option
3. **Select**: User picks vault → prompt for private key → load
4. **Create**: Generate new identity (like `init`) → show keys for user to save → load vault

## Edge Cases

- [ ] Empty directory: show only "Create vault", no empty list
- [ ] Wrong key: decrypt fails → show error, allow retry or back to list
- [ ] Corrupted vault: load fails → show error, allow back to list
- [ ] Quit: from vault list, allow Quit without selecting
- [ ] Directory permission: `C_BIO_VAULT_DIR` unreadable → show permission error

## Optional Enhancements

- [ ] Vault label: optional `.label` file next to vault for user-friendly identification
- [ ] Import from backup: "Import vault" alongside "Create vault"
- [ ] Switch vault: from main menu, return to vault list and select another

## Out of Scope (for now)

- Label file format and storage convention
- Reading activity log metadata for display before unlock (requires decrypt)
