# Cardano Vesting Contract

This project implements a vesting contract on the Cardano blockchain using Aiken. The contract allows for locking funds that can be unlocked according to a predefined schedule.

## Project Structure

- `validators/vesting.ak`: Main validator script
- `generate-credentials.ts`: Script to generate wallet credentials
- `lock-funds.ts`: Script to lock funds in the vesting contract
- `unlock-funds.ts`: Script to unlock funds from the vesting contract

## Prerequisites

- Node.js
- Aiken
- Cardano CLI tools

## Setup

1. Install dependencies:

```bash
npm install
```

2. Generate credentials:

```bash
ts-node generate-credentials.ts
```

## Usage

1. Lock funds:

```bash
ts-node lock-funds.ts
```

2. Unlock funds:

```bash
ts-node unlock-funds.ts
```

## License

Apache-2.0
