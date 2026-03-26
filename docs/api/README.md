**CBIO Node Runtime Agent API v1.48.5**

***

# CBIO Node Runtime Agent API v1.48.5

## Enumerations

- [IdentityErrorCode](enumerations/IdentityErrorCode.md)

## Classes

- [IdentityError](classes/IdentityError.md)
- [VaultCore](classes/VaultCore.md)
- [VaultCoreError](classes/VaultCoreError.md)

## Interfaces

- [AgentClient](interfaces/AgentClient.md)
- [AgentDispatchIntent](interfaces/AgentDispatchIntent.md)
- [AgentDispatchTransport](interfaces/AgentDispatchTransport.md)
- [AgentIdentity](interfaces/AgentIdentity.md)
- [AgentSigner](interfaces/AgentSigner.md)
- [CbioRuntime](interfaces/CbioRuntime.md)
- [CreateAgentClientOptions](interfaces/CreateAgentClientOptions.md)
- [CreatedVault](interfaces/CreatedVault.md)
- [CreateIdentityOptions](interfaces/CreateIdentityOptions.md)
- [CreatePersistentVaultCoreDependenciesOptions](interfaces/CreatePersistentVaultCoreDependenciesOptions.md)
- [CreateVaultClientOptions](interfaces/CreateVaultClientOptions.md)
- [CreateVaultOptions](interfaces/CreateVaultOptions.md)
- [DefaultPolicyEngineOptions](interfaces/DefaultPolicyEngineOptions.md)
- [InitializedVaultCustody](interfaces/InitializedVaultCustody.md)
- [InitializeVaultCustodyOptions](interfaces/InitializeVaultCustodyOptions.md)
- [IStorageProvider](interfaces/IStorageProvider.md)
- [OwnerDefineSecretTargetsInput](interfaces/OwnerDefineSecretTargetsInput.md)
- [OwnerSecretTargetBinding](interfaces/OwnerSecretTargetBinding.md)
- [OwnerStoreSecretInput](interfaces/OwnerStoreSecretInput.md)
- [OwnerWriteSecretInput](interfaces/OwnerWriteSecretInput.md)
- [RecoveredVault](interfaces/RecoveredVault.md)
- [RecoverVaultOptions](interfaces/RecoverVaultOptions.md)
- [RestoreIdentityOptions](interfaces/RestoreIdentityOptions.md)
- [Signer](interfaces/Signer.md)
- [VaultAuditQueryInput](interfaces/VaultAuditQueryInput.md)
- [VaultClient](interfaces/VaultClient.md)
- [VaultCoreDependenciesOptions](interfaces/VaultCoreDependenciesOptions.md)
- [VaultCreateAgentInput](interfaces/VaultCreateAgentInput.md)
- [VaultDeleteSecretInput](interfaces/VaultDeleteSecretInput.md)
- [VaultExportSecretInput](interfaces/VaultExportSecretInput.md)
- [VaultGrantCapabilityInput](interfaces/VaultGrantCapabilityInput.md)
- [VaultIdentity](interfaces/VaultIdentity.md)
- [VaultListAgentsInput](interfaces/VaultListAgentsInput.md)
- [VaultListCapabilitiesInput](interfaces/VaultListCapabilitiesInput.md)
- [VaultMetadata](interfaces/VaultMetadata.md)
- [VaultObject](interfaces/VaultObject.md)
- [VaultProfile](interfaces/VaultProfile.md)
- [VaultRegisterAgentInput](interfaces/VaultRegisterAgentInput.md)
- [VaultRegisterFlowInput](interfaces/VaultRegisterFlowInput.md)
- [VaultRevokeCapabilityInput](interfaces/VaultRevokeCapabilityInput.md)
- [VaultSigner](interfaces/VaultSigner.md)

## Type Aliases

- [AgentCapabilityEnvelope](type-aliases/AgentCapabilityEnvelope.md)
- [CbioRuntimeModule](type-aliases/CbioRuntimeModule.md)

## Variables

- [DEFAULT\_VAULT\_KEY\_CUSTODY\_BLOB\_KEY](variables/DEFAULT_VAULT_KEY_CUSTODY_BLOB_KEY.md)

## Functions

- [createAgentClient](functions/createAgentClient.md)
- [createIdentity](functions/createIdentity.md)
- [createOwnerHttpFlowBoundary](functions/createOwnerHttpFlowBoundary.md)
- [createPersistentVaultCoreDependencies](functions/createPersistentVaultCoreDependencies.md)
- [createStandardAcquireBoundary](functions/createStandardAcquireBoundary.md)
- [createStandardDispatchBoundary](functions/createStandardDispatchBoundary.md)
- [createVault](functions/createVault.md)
- [createVaultClient](functions/createVaultClient.md)
- [createVaultCore](functions/createVaultCore.md)
- [createVaultCoreDependencies](functions/createVaultCoreDependencies.md)
- [createVaultService](functions/createVaultService.md)
- [createWorkspaceStorage](functions/createWorkspaceStorage.md)
- [deriveIdentityId](functions/deriveIdentityId.md)
- [deriveVaultWorkingKeyFromPassword](functions/deriveVaultWorkingKeyFromPassword.md)
- [getDefaultWorkspaceDir](functions/getDefaultWorkspaceDir.md)
- [handleVaultHttpDispatch](functions/handleVaultHttpDispatch.md)
- [initializeVaultCustody](functions/initializeVaultCustody.md)
- [listVaults](functions/listVaults.md)
- [readVaultProfile](functions/readVaultProfile.md)
- [recoverVault](functions/recoverVault.md)
- [recoverVaultWorkingKey](functions/recoverVaultWorkingKey.md)
- [restoreIdentity](functions/restoreIdentity.md)
- [updateVaultMetadata](functions/updateVaultMetadata.md)
- [wrapVaultCoreAsVaultService](functions/wrapVaultCoreAsVaultService.md)
- [writeVaultProfile](functions/writeVaultProfile.md)
