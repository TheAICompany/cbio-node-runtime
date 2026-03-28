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
  createIdentity,
  createVault,
  listVaults,
  recoverVault,
  createOwnerSession,
  createOwnerClient,
  createAgentClient,
  FsStorageProvider,
} from '@the-ai-company/cbio-node-runtime';
```

## 아키텍처

1. secret 평문은 `vault-core` 내부에만 존재합니다
2. `clients/owner`는 소유자 쓰기, 평문 내보내기, 감사 읽기 및 **Agent/권한 관리** (`listAgents`, `listGrants`, `revokeGrant`)를 담당합니다.
3. `clients/agent` 는 agent 서명 dispatch 요청을 만듭니다
4. `vault-ingress` 는 vault 경계 내부에서 grant 해석과 dispatch ingress 를 처리합니다

권장되는 persistent-vault 주 경로:

- `createVault(...)` 로 persistent vault 를 생성합니다
- `recoverVault(...)` 로 `vaultId` 와 `password` 를 사용해 persistent vault 를 복구합니다
- GUI 나 장수명 프로세스에서는 raw `createOwnerClient(...)` 를 캐시하지 말고 `createOwnerSession(...)` 을 유지합니다
- `createOwnerClient(...)` 는 현재 runtime 안의 짧은 스크립트나 일회성 작업에 사용합니다

이전 `CbioIdentity` 중심 API 는 더 이상 주요 제품 표면이 아닙니다.

## 빌드

```bash
npm run build
npm run test
```
