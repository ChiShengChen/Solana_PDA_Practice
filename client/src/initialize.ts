import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';

import {
  getConnection,
  getPayer,
  getProgramId,
  deriveUserDataAccountAddress,
  InitializeInstruction,
} from './utils';

async function main() {
  try {
    // Get the connection
    const connection = getConnection();
    
    // Get the payer
    const payer = getPayer();
    console.log('Using payer:', payer.publicKey.toString());
    
    // Get payer's balance
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`Payer balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    // Get program ID
    const programId = getProgramId();
    console.log('Program ID:', programId.toString());
    
    // Derive the user data account address
    const [userDataAccount, bump] = deriveUserDataAccountAddress(
      payer.publicKey,
      programId
    );
    console.log('User data account address:', userDataAccount.toString());
    console.log('PDA bump seed:', bump);
    
    // Check if account already exists
    const accountInfo = await connection.getAccountInfo(userDataAccount);
    console.log('Account exists:', accountInfo !== null);
    if (accountInfo) {
      console.log('Account data length:', accountInfo.data.length);
      console.log('Account owner:', accountInfo.owner.toString());
    }
    
    // Prepare instruction data
    const name = "John Doe";
    const message = "Hello Solana!";
    console.log(`Initializing account with name "${name}" and message "${message}"`);
    
    const instructionData = new InitializeInstruction({
      name,
      message,
    }).serialize();
    console.log('Instruction data:', [...instructionData]);
    
    // Create transaction
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
    
    const transaction = new Transaction().add(instruction);
    
    // Send transaction
    console.log('Sending transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      { commitment: 'confirmed' }
    );
    
    console.log('Transaction successful!');
    console.log('Signature:', signature);
    console.log('User data account initialized successfully');
    
  } catch (error) {
    console.error('Error:', error);
    if (error && typeof error === 'object' && 'logs' in error) {
      console.error('Program logs:', error.logs);
    }
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
); 