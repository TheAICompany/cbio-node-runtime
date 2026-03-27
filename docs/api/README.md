**CBIO Node Runtime Agent API v1.62.1**

***

# CBIO Node Runtime Agent API v1.62.1

## Enumerations

- [IdentityErrorCode](enumerations/IdentityErrorCode.md)
- [OwnerClientErrorCode](enumerations/OwnerClientErrorCode.md)

## Classes

- [IdentityError](classes/IdentityError.md)
- [OwnerClientError](classes/OwnerClientError.md)
- [VaultCore](classes/VaultCore.md)
- [VaultCoreError](classes/VaultCoreError.md)

## Interfaces

- [AgentClient](interfaces/AgentClient.md)
- [AgentDispatchIntent](interfaces/AgentDispatchIntent.md)
- [AgentDispatchTransport](interfaces/AgentDispatchTransport.md)
- [AgentIdentity](interfaces/AgentIdentity.md)
- [AgentSigner](interfaces/AgentSigner.md)
- [AgentSubmitCapabilityRequestInput](interfaces/AgentSubmitCapabilityRequestInput.md)
- [CbioRuntime](interfaces/CbioRuntime.md)
- [CreateAgentClientOptions](interfaces/CreateAgentClientOptions.md)
- [CreatedVault](interfaces/CreatedVault.md)
- [CreateIdentityOptions](interfaces/CreateIdentityOptions.md)
- [CreateOwnerSessionOptions](interfaces/CreateOwnerSessionOptions.md)
- [CreatePersistentVaultCoreDependenciesOptions](interfaces/CreatePersistentVaultCoreDependenciesOptions.md)
- [CreateVaultClientOptions](interfaces/CreateVaultClientOptions.md)
- [CreateVaultOptions](interfaces/CreateVaultOptions.md)
- [DefaultPolicyEngineOptions](interfaces/DefaultPolicyEngineOptions.md)
- [InitializedVaultCustody](interfaces/InitializedVaultCustody.md)
- [InitializeVaultCustodyOptions](interfaces/InitializeVaultCustodyOptions.md)
- [IStorageProvider](interfaces/IStorageProvider.md)
- [OwnerAgentProvisionResult](interfaces/OwnerAgentProvisionResult.md)
- [OwnerCreateSecretInput](interfaces/OwnerCreateSecretInput.md)
- [OwnerRemoveSecretInput](interfaces/OwnerRemoveSecretInput.md)
- [OwnerSensitiveActionConfirmation](interfaces/OwnerSensitiveActionConfirmation.md)
- [OwnerSensitiveActionContext](interfaces/OwnerSensitiveActionContext.md)
- [OwnerSession](interfaces/OwnerSession.md)
- [OwnerUpdateSecretInput](interfaces/OwnerUpdateSecretInput.md)
- [RecoveredVault](interfaces/RecoveredVault.md)
- [RecoverVaultOptions](interfaces/RecoverVaultOptions.md)
- [RestoreIdentityOptions](interfaces/RestoreIdentityOptions.md)
- [Signer](interfaces/Signer.md)
- [VaultApproveCapabilityRequestInput](interfaces/VaultApproveCapabilityRequestInput.md)
- [VaultApproveDispatchInput](interfaces/VaultApproveDispatchInput.md)
- [VaultAuditQueryInput](interfaces/VaultAuditQueryInput.md)
- [VaultClient](interfaces/VaultClient.md)
- [VaultCoreDependenciesOptions](interfaces/VaultCoreDependenciesOptions.md)
- [VaultCreateAgentInput](interfaces/VaultCreateAgentInput.md)
- [VaultExportSecretInput](interfaces/VaultExportSecretInput.md)
- [VaultGrantCapabilityInput](interfaces/VaultGrantCapabilityInput.md)
- [VaultGrantCapabilityRequest](interfaces/VaultGrantCapabilityRequest.md)
- [VaultIdentity](interfaces/VaultIdentity.md)
- [VaultImportAgentInput](interfaces/VaultImportAgentInput.md)
- [VaultIssueSessionTokenInput](interfaces/VaultIssueSessionTokenInput.md)
- [VaultListAgentsInput](interfaces/VaultListAgentsInput.md)
- [VaultListCapabilitiesInput](interfaces/VaultListCapabilitiesInput.md)
- [VaultListSecretsInput](interfaces/VaultListSecretsInput.md)
- [VaultMetadata](interfaces/VaultMetadata.md)
- [VaultObject](interfaces/VaultObject.md)
- [VaultProfile](interfaces/VaultProfile.md)
- [VaultReadAgentPrivateKeyInput](interfaces/VaultReadAgentPrivateKeyInput.md)
- [VaultReadSecretPlaintextInput](interfaces/VaultReadSecretPlaintextInput.md)
- [VaultRegisterFlowInput](interfaces/VaultRegisterFlowInput.md)
- [VaultRevokeCapabilityInput](interfaces/VaultRevokeCapabilityInput.md)
- [VaultRevokeSessionTokenInput](interfaces/VaultRevokeSessionTokenInput.md)
- [VaultSigner](interfaces/VaultSigner.md)
- [VaultSubmitCapabilityRequestInput](interfaces/VaultSubmitCapabilityRequestInput.md)
- [VaultUpdateAgentInput](interfaces/VaultUpdateAgentInput.md)

## Type Aliases

- [AgentCapabilityEnvelope](type-aliases/AgentCapabilityEnvelope.md)
- [AgentVisibleSecretRecord](type-aliases/AgentVisibleSecretRecord.md)
- [CbioRuntimeModule](type-aliases/CbioRuntimeModule.md)
- [OwnerGrantCapabilityInput](type-aliases/OwnerGrantCapabilityInput.md)

## Variables

- [DEFAULT\_VAULT\_KEY\_CUSTODY\_BLOB\_KEY](variables/DEFAULT_VAULT_KEY_CUSTODY_BLOB_KEY.md)

## Functions

- [createAgentClient](functions/createAgentClient.md)
- [createIdentity](functions/createIdentity.md)
- [createOwnerHttpFlowBoundary](functions/createOwnerHttpFlowBoundary.md)
- [createOwnerSession](functions/createOwnerSession.md)
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
- [handleVaultAgentControlHttp](functions/handleVaultAgentControlHttp.md)
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
