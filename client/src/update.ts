import {
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

import {
  getConnection,
  getPayer,
  getProgramId,
  deriveUserDataAccountAddress,
  fetchUserData,
  UpdateMessageInstruction,
} from './utils';

async function main() {
  try {
    // Get the connection
    const connection = getConnection();
    
    // Get the payer
    const payer = getPayer();
    console.log('Using payer:', payer.publicKey.toString());
    
    // Get program ID
    const programId = getProgramId();
    console.log('Program ID:', programId.toString());
    
    // Derive the user data account address
    const [userDataAccount] = deriveUserDataAccountAddress(
      payer.publicKey,
      programId
    );
    console.log('User data account address:', userDataAccount.toString());
    
    // Check if account exists
    const userData = await fetchUserData(connection, userDataAccount);
    if (!userData) {
      console.error('User data account not found or not initialized');
      return;
    }
    
    console.log('Current account data:');
    console.log('- Name:', userData.name);
    console.log('- Message:', userData.message);
    console.log('- Update count:', userData.update_count.toString());
    
    // Prepare instruction data
    const newMessage = `Updated message! Count: ${userData.update_count + BigInt(1)}`;
    console.log(`Updating message to: "${newMessage}"`);
    
    const instructionData = new UpdateMessageInstruction({
      message: newMessage,
    }).serialize();
    
    // Create transaction
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: false },
        { pubkey: userDataAccount, isSigner: false, isWritable: true },
      ],
      programId,
      data: instructionData,
    });
    
    const transaction = new Transaction().add(instruction);
    
    // Send transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      { commitment: 'confirmed' }
    );
    
    console.log('Transaction successful!');
    console.log('Signature:', signature);
    
    // Fetch updated account data
    const updatedUserData = await fetchUserData(connection, userDataAccount);
    if (updatedUserData) {
      console.log('Updated account data:');
      console.log('- Name:', updatedUserData.name);
      console.log('- Message:', updatedUserData.message);
      console.log('- Update count:', updatedUserData.update_count.toString());
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
); 