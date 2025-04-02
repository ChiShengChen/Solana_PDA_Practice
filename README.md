# Solana Account Demo

This repository demonstrates a simple Solana program that manages user data accounts with messages that can be updated.

## Current Program Address
```
5TpistrGNmHxtaGHH2JJTRbevqRwS1tf4hNGpG3hh4Co
```

## Program Derived Addresses (PDAs)

This project utilizes Program Derived Addresses (PDAs) for account management:

- Each user gets a unique data account with an address deterministically derived from their public key and the program ID
- The PDA uses "user-data" as a seed prefix to ensure no collision with other PDAs
- The bump seed value (255 in the current implementation) ensures the derived address falls off the ed25519 curve
- The program can sign for this PDA account without needing a private key
- The user data account stores information such as the owner's public key, name, message, and update count
- Using PDAs is a common practice in Solana programming, allowing programs to own and manage accounts without generating and storing private keys for each account

## Deployment Instructions

### Prerequisites
- Solana CLI tools installed
- Rust and Cargo installed with Solana BPF target
- Node.js and npm installed

### Steps to Deploy

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/solana-new-program-clean.git
   cd solana-new-program-clean
   ```

2. **Build the Solana program:**
   ```bash
   cargo build-sbf
   ```

3. **Deploy the program using your keypair:**
   ```bash
   solana program deploy --program-id program-keypair.json target/deploy/solana_clean_demo.so
   ```

4. **Configure the client environment:**
   Create a `.env` file in the `client` directory with the following content:
   ```
   SOLANA_RPC_URL=http://localhost:8899
   PROGRAM_ID=5TpistrGNmHxtaGHH2JJTRbevqRwS1tf4hNGpG3hh4Co
   ```

5. **Install client dependencies:**
   ```bash
   cd client
   npm install
   ```

## Running the Demo

### Initialize a new user data account:
```bash
cd client
npm run init
```

### Update a message:
```bash
cd client
npm run update-message
```

## Current Update Message Output

When running the update message command, the current output shows:

```
Using payer: 36nefnucUMrkJJDWnWCpmbeXN4PaYefhPVpk3RZsSQNf
Program ID: 5TpistrGNmHxtaGHH2JJTRbevqRwS1tf4hNGpG3hh4Co
User data account address: CpsYPwaDUTfuAS89EXMj9bCfJ5mPAsfsY5YykbZvPxxB
PDA bump seed: 255
Account exists: true
Account data length: 369
Account owner: 5TpistrGNmHxtaGHH2JJTRbevqRwS1tf4hNGpG3hh4Co
Data length: 369
First few bytes: <Buffer 01 1f 32 e4 d7 45 3b 3d 08 79>
is_initialized: true
owner: 1f32e4d7453b3d0879533039b4fc329c95880b6c4f0632af265ebb40c32dde2c
name length: 8
name: John Doe
message length: 13
message: Hello Solana!
update_count: 1
Total bytes read: 70
Remaining bytes: 299
Current account data: {
  is_initialized: true,
  owner: '1f32e4d7453b3d0879533039b4fc329c95880b6c4f0632af265ebb40c32dde2c',
  name: 'John Doe',
  message: 'Hello Solana!',
  update_count: 1
}
Updating message to: "Hello Solana, again!"
Instruction data: [1, 20, 0, 0, 0, 72, 101, 108, 108, 111, 32, 83, 111, 108, 97, 110, 97, 44, 32, 97, 103, 97, 105, 110, 33]
Sending transaction...
Error: SendTransactionError: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x2
```

The error indicates there is an issue with the account data deserialization in the Rust program. The client successfully reads the account data and attempts to update the message, but the transaction simulation fails with error code 0x2 (DataTypeMismatch). 

The program is currently unable to process the update message instruction due to a mismatch between the expected data structure in the Rust program and the actual data structure in the Solana account. 