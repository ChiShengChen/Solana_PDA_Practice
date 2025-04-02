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

## Detailed PDA Workflow and Code Analysis

### 1. PDA Address Derivation

PDAs are deterministically derived from a combination of seeds and the program ID.

#### Rust Code (src/processor.rs)
```rust
// Derive PDA address
let (expected_address, bump) = Pubkey::find_program_address(
    &[b"user-data", user_account.key.as_ref()],
    program_id,
);
```

#### TypeScript Code (client/src/utils.ts)
```typescript
// Function to derive user data account address
export function deriveUserDataAccountAddress(
  owner: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user-data'), owner.toBuffer()],
    programId
  );
}
```

### 2. PDA Account Creation

During initialization, a new PDA account is created to store user data.

#### Rust Code (src/processor.rs)
```rust
// Create PDA account
invoke_signed(
    &system_instruction::create_account(
        user_account.key,
        user_data_account.key,
        lamports_required,
        data_size as u64,
        program_id,
    ),
    &[
        user_account.clone(),
        user_data_account.clone(),
        system_program.clone(),
    ],
    &[&[b"user-data", user_account.key.as_ref(), &[bump]]],
)?;

// Initialize account data
let account_data = UserData::new(*user_account.key, name, message)?;
let mut data = user_data_account.data.borrow_mut();
account_data.serialize(&mut &mut data[..])?;
```

#### TypeScript Code (client/src/init.ts)
```typescript
// Create initialization instruction
const instructionData = new InitializeInstruction({
  name: name,
  message: message,
}).serialize();

// Create transaction instruction
const instruction = new TransactionInstruction({
  keys: [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: userDataAccount, isSigner: false, isWritable: true },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  programId,
  data: instructionData,
});
```

### 3. Account Data Reading

Retrieving and deserializing data from the PDA account.

#### Rust Code (src/processor.rs)
```rust
// Deserialize account data
let mut user_data = match UserData::safe_deserialize(&account_data) {
    Ok(data) => {
        msg!("Successfully deserialized account data");
        msg!("Deserialized data: {:?}", data);
        data
    }
    Err(err) => {
        msg!("Failed to deserialize account data: {:?}", err);
        return Err(AccountDemoError::DataTypeMismatch.into());
    }
};
```

#### TypeScript Code (client/src/utils.ts)
```typescript
// UserData deserialization
static deserialize(data: Buffer): UserData {
  try {
    console.log('Data length:', data.length);
    console.log('First few bytes:', data.slice(0, 10));

    // Manual deserialization
    let offset = 0;

    // Read is_initialized (1 byte)
    const is_initialized = data[offset] === 1;
    offset += 1;
    console.log('is_initialized:', is_initialized);

    // Read owner (32 bytes)
    const owner = data.slice(offset, offset + 32);
    offset += 32;
    console.log('owner:', owner.toString('hex'));

    // Read name length (4 bytes)
    const nameLength = data.readUInt32LE(offset);
    offset += 4;
    console.log('name length:', nameLength);

    // Read name
    const name = data.slice(offset, offset + nameLength).toString('utf8');
    offset += nameLength;
    console.log('name:', name);

    // Read message length (4 bytes)
    const messageLength = data.readUInt32LE(offset);
    offset += 4;
    console.log('message length:', messageLength);

    // Read message
    const message = data.slice(offset, offset + messageLength).toString('utf8');
    offset += messageLength;
    console.log('message:', message);

    // Read update_count (8 bytes)
    const update_count = Number(data.readBigUInt64LE(offset));
    offset += 8;
    console.log('update_count:', update_count);

    console.log('Total bytes read:', offset);
    console.log('Remaining bytes:', data.length - offset);

    return new UserData({
      is_initialized,
      owner,
      name,
      message,
      update_count,
    });
  } catch (error) {
    console.error('Deserialization error:', error);
    throw error;
  }
}
```

### 4. Account Data Updating

Modifying the message stored in the PDA account.

#### Rust Code (src/processor.rs)
```rust
// Update message and counter
msg!("Updating message and counter...");
user_data.message = message;
user_data.update_count += 1;

// Save updated data back to account
msg!("Saving updated data back to account...");
let mut data = user_data_account.data.borrow_mut();
user_data.serialize(&mut &mut data[..])?;
```

#### TypeScript Code (client/src/update-message.ts)
```typescript
// Prepare instruction data
const instructionData = new UpdateMessageInstruction({
  message: newMessage,
}).serialize();

// Create transaction instruction
const instruction = new TransactionInstruction({
  keys: [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: userDataAccount, isSigner: false, isWritable: true },
  ],
  programId,
  data: instructionData,
});
```

### Data Structures

#### Rust Code (src/state.rs)
```rust
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct UserData {
    pub is_initialized: bool,
    pub owner: [u8; 32],  // Store Pubkey as a byte array
    pub name: String,
    pub message: String,
    pub update_count: u64,
}
```

#### TypeScript Code (client/src/utils.ts)
```typescript
export class UserData {
  static MAX_NAME_LENGTH = 64;
  static MAX_MESSAGE_LENGTH = 256;

  is_initialized: boolean;
  owner: Uint8Array;  // Fixed length 32 bytes
  name: string;
  message: string;
  update_count: number;

  constructor(props: {
    is_initialized: boolean;
    owner: Uint8Array;
    name: string;
    message: string;
    update_count: number;
  }) {
    this.is_initialized = props.is_initialized;
    this.owner = props.owner;
    this.name = props.name;
    this.message = props.message;
    this.update_count = props.update_count;
  }

  static schema = new Map([
    [
      UserData,
      {
        kind: 'struct',
        fields: [
          ['is_initialized', 'u8'],
          ['owner', ['u8', 32]],
          ['name', 'string'],
          ['message', 'string'],
          ['update_count', 'u64'],
        ],
      },
    ],
  ]);
}
```

### Instruction Definitions

#### Rust Code (src/instruction.rs)
```rust
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum AccountDemoInstruction {
    /// Initialize a new UserData account
    Initialize { name: String, message: String },
    
    /// Update the message in a UserData account
    UpdateMessage { message: String },
}
```

#### TypeScript Code (client/src/utils.ts)
```typescript
export enum AccountDemoInstruction {
  Initialize = 0,
  UpdateMessage = 1,
}

export class UpdateMessageInstruction {
  instruction: AccountDemoInstruction;
  message: string;

  constructor(props: { message: string }) {
    if (props.message.length > UserData.MAX_MESSAGE_LENGTH) {
      throw new Error(`Message is too long. Maximum length is ${UserData.MAX_MESSAGE_LENGTH} characters`);
    }
    this.instruction = AccountDemoInstruction.UpdateMessage;
    this.message = props.message;
  }

  static schema = new Map([
    [
      UpdateMessageInstruction,
      {
        kind: 'struct',
        fields: [
          ['instruction', 'u8'],
          ['message', 'string'],
        ],
      },
    ],
  ]);

  serialize(): Buffer {
    const data = {
      instruction: this.instruction,
      message: this.message,
    };
    return Buffer.from(borsh.serialize(UpdateMessageInstruction.schema, data));
  }
}
```

This project demonstrates the complete lifecycle of Solana PDAs, from deriving PDA addresses, creating PDA accounts, reading data, to updating data. Through Program Derived Addresses, Solana programs can securely own and manage accounts without needing to generate and store private keys for each account.

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