# cbio Vault Runtime

cbio 권한 코어의 로컬 vault 런타임입니다. CLI나 TUI는 포함하지 않습니다.

주요 공개 모듈:
- `vault-core`
- `clients/owner`
- `clients/agent`
- `vault-ingress`

## 설치

```bash
npm install @the-ai-company/cbio-node-runtime
```

## 사용

```ts
import {
  createVaultService,
  createIdentity,
  readIdentityMetadata,
   createVault,
  listIdentities,
  listVaults,
  recoverVault,
  LocalVaultTransport,
  createVaultClient,
  createAgentClient,
  FsStorageProvider,
} from '@the-ai-company/cbio-node-runtime';
```

## 아키텍처

1. secret 평문은 `vault-core` 내부에만 존재합니다
2. `clients/owner`는 소유자 쓰기, 평문 내보내기, 감사 읽기 및 **Agent/권한 관리** (`listAgents`, `listCapabilities`, `revokeCapability`)를 담당합니다.
3. `clients/agent` 는 agent 서명 dispatch 요청을 만듭니다
4. `vault-ingress` 는 vault 경계 내부에서 capability 해석과 dispatch ingress 를 처리합니다

권장되는 persistent-vault 주 경로:

- `createVault(...)` 로 persistent vault 를 생성합니다 (`publicMetadata` 를 통한 공개 정보 검색 지원)
- `recoverVault(...)` 로 owner identity 를 사용해 persistent vault 를 복구합니다
- 분리된 스토리지 계층: `vaults/` (기명 Vault) 및 `identities/` (개인 ID 공간)
    - 닉네임과 같은 모든 공개 메타데이터는 `VaultPublicMetadata` 인터페이스를 따르며, **디지털 서명**이 포함되어 있어 SDK가 그 정당성을 자동으로 검증합니다.

이전 `CbioIdentity` 중심 API 는 더 이상 주요 제품 표면이 아닙니다.

## 빌드

```bash
npm run build
npm run test
```
