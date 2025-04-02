import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

import {
  getConnection,
  getPayer,
  getProgramId,
  deriveUserDataAccountAddress,
  UpdateMessageInstruction,
  UserData,
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
    const [userDataAccount, bump] = deriveUserDataAccountAddress(
      payer.publicKey,
      programId
    );
    console.log('User data account address:', userDataAccount.toString());
    console.log('PDA bump seed:', bump);
    
    // Check if account exists
    const accountInfo = await connection.getAccountInfo(userDataAccount);
    console.log('Account exists:', accountInfo !== null);
    if (!accountInfo) {
      throw new Error('Account does not exist');
    }
    console.log('Account data length:', accountInfo.data.length);
    console.log('Account owner:', accountInfo.owner.toString());
    
    // Verify account owner
    if (!accountInfo.owner.equals(programId)) {
      throw new Error(`Account owner mismatch. Expected: ${programId.toString()}, Got: ${accountInfo.owner.toString()}`);
    }

    // Deserialize and verify account data
    try {
      const userData = UserData.deserialize(accountInfo.data);
      console.log('Current account data:', {
        is_initialized: userData.isInitialized(),
        owner: Buffer.from(userData.owner).toString('hex'),
        name: userData.name,
        message: userData.message,
        update_count: userData.update_count
      });
    } catch (error) {
      console.error('Failed to deserialize account data:', error);
      throw error;
    }
    
    // Prepare instruction data
    const newMessage = "Hello Solana, again!";
    console.log(`Updating message to: "${newMessage}"`);
    
    // Verify message length
    if (newMessage.length > UserData.MAX_MESSAGE_LENGTH) {
      throw new Error(`Message is too long. Maximum length is ${UserData.MAX_MESSAGE_LENGTH} characters`);
    }
    
    const instructionData = new UpdateMessageInstruction({
      message: newMessage,
    }).serialize();
    console.log('Instruction data:', [...instructionData]);
    
    // Create transaction
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: userDataAccount, isSigner: false, isWritable: true },
      ],
      programId,
      data: instructionData,
    });
    
    const transaction = new Transaction().add(instruction);
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;
    
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
    console.log('Message updated successfully');
    
    // Verify the update
    const updatedAccountInfo = await connection.getAccountInfo(userDataAccount);
    if (updatedAccountInfo) {
      console.log('Updated account data length:', updatedAccountInfo.data.length);
      try {
        const updatedUserData = UserData.deserialize(updatedAccountInfo.data);
        console.log('Updated account data:', {
          is_initialized: updatedUserData.isInitialized(),
          owner: Buffer.from(updatedUserData.owner).toString('hex'),
          name: updatedUserData.name,
          message: updatedUserData.message,
          update_count: updatedUserData.update_count
        });
      } catch (error) {
        console.error('Failed to deserialize updated account data:', error);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    if (error && typeof error === 'object') {
      if ('logs' in error) {
        console.error('Program logs:', error.logs);
      }
      if ('message' in error) {
        console.error('Error message:', error.message);
      }
    }
    throw error;
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
); 