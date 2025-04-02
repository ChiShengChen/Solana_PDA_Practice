import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as borsh from 'borsh';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// UserData class that matches the Rust struct
export class UserData {
  static MAX_NAME_LENGTH = 64;
  static MAX_MESSAGE_LENGTH = 256;

  is_initialized: boolean;  // Keep as boolean in TypeScript
  owner: Uint8Array;  // Fixed length 32 bytes
  name: string;
  message: string;
  update_count: number;  // Changed from bigint to number for u64

  constructor(props: {
    is_initialized: boolean;
    owner: Uint8Array;  // Fixed length 32 bytes
    name: string;
    message: string;
    update_count: number;  // Changed from bigint to number for u64
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
          ['is_initialized', 'u8'],  // Use u8 for serialization
          ['owner', ['u8', 32]],
          ['name', 'string'],
          ['message', 'string'],
          ['update_count', 'u64'],
        ],
      },
    ],
  ]);

  // Calculate the size of the account data
  static getSize(name: string, message: string): number {
    // 1 byte for is_initialized
    // 32 bytes for owner
    // 4 bytes for name length + name bytes
    // 4 bytes for message length + message bytes
    // 8 bytes for update_count
    return 1 + 32 + 4 + name.length + 4 + message.length + 8;
  }

  // Convert boolean to u8 for serialization
  serialize(): Buffer {
    const data = {
      is_initialized: this.is_initialized ? 1 : 0,
      owner: this.owner,
      name: this.name,
      message: this.message,
      update_count: this.update_count,
    };
    return Buffer.from(borsh.serialize(UserData.schema, data));
  }

  // Convert u8 to boolean for deserialization
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

      // Read name length (4 bytes, little endian)
      const nameLength = data.readUInt32LE(offset);
      offset += 4;
      console.log('name length:', nameLength);

      // Read name
      const name = data.slice(offset, offset + nameLength).toString('utf8');
      offset += nameLength;
      console.log('name:', name);

      // Read message length (4 bytes, little endian)
      const messageLength = data.readUInt32LE(offset);
      offset += 4;
      console.log('message length:', messageLength);

      // Read message
      const message = data.slice(offset, offset + messageLength).toString('utf8');
      offset += messageLength;
      console.log('message:', message);

      // Read update_count (8 bytes, little endian)
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

  // Helper method to check if account is initialized
  isInitialized(): boolean {
    return this.is_initialized;
  }
}

// Instruction enum that matches the Rust instruction enum
export enum AccountDemoInstruction {
  Initialize = 0,
  UpdateMessage = 1,
}

export class InitializeInstruction {
  instruction: AccountDemoInstruction;
  name: string;
  message: string;

  constructor(props: { name: string; message: string }) {
    if (props.name.length > UserData.MAX_NAME_LENGTH) {
      throw new Error(`Name is too long. Maximum length is ${UserData.MAX_NAME_LENGTH} characters`);
    }
    if (props.message.length > UserData.MAX_MESSAGE_LENGTH) {
      throw new Error(`Message is too long. Maximum length is ${UserData.MAX_MESSAGE_LENGTH} characters`);
    }
    this.instruction = AccountDemoInstruction.Initialize;
    this.name = props.name;
    this.message = props.message;
  }

  static schema = new Map([
    [
      InitializeInstruction,
      {
        kind: 'struct',
        fields: [
          ['instruction', 'u8'],
          ['name', 'string'],
          ['message', 'string'],
        ],
      },
    ],
  ]);

  serialize(): Buffer {
    return Buffer.from(borsh.serialize(InitializeInstruction.schema, this));
  }
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
    return Buffer.from(borsh.serialize(UpdateMessageInstruction.schema, this));
  }
}

// Helper function to get connection
export function getConnection(): Connection {
  const url = process.env.SOLANA_RPC_URL || 'http://localhost:8899';
  return new Connection(url, 'confirmed');
}

// Helper function to get or create keypair
export function getPayer(): Keypair {
  const secret = JSON.parse(
    fs.readFileSync('/home/aidan/jlp-leverage-strategy/my-solana-wallet/my-keypair.json', 'utf-8')
  ) as number[];
  const secretKey = Uint8Array.from(secret);
  return Keypair.fromSecretKey(secretKey);
}

// Helper function to get program ID
export function getProgramId(): PublicKey {
  const programIdStr = process.env.PROGRAM_ID;
  if (!programIdStr) {
    throw new Error('Program ID not found in environment variables');
  }
  return new PublicKey(programIdStr);
}

// Function to deserialize account data
export function deserializeUserData(data: Buffer): UserData {
  return borsh.deserialize(UserData.schema, UserData, data);
}

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

// Function to fetch account data
export async function fetchUserData(
  connection: Connection,
  userDataAccount: PublicKey
): Promise<UserData | null> {
  try {
    const accountInfo = await connection.getAccountInfo(userDataAccount);
    if (accountInfo === null) {
      console.log('Account not found');
      return null;
    }
    return deserializeUserData(accountInfo.data);
  } catch (error) {
    console.error('Error fetching account data:', error);
    return null;
  }
} 