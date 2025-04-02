import {
  Connection,
  PublicKey,
} from '@solana/web3.js';

import {
  getConnection,
  getPayer,
  getProgramId,
  deriveUserDataAccountAddress,
  fetchUserData,
} from './utils';

async function main() {
  try {
    // Get the connection
    const connection = getConnection();
    console.log('Connected to', connection.rpcEndpoint);
    
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
    
    // Fetch account data
    console.log('Fetching account data...');
    const userData = await fetchUserData(connection, userDataAccount);
    
    if (userData) {
      console.log('\nAccount found!');
      console.log('---------------------');
      console.log('Owner:', new PublicKey(userData.owner).toString());
      console.log('Name:', userData.name);
      console.log('Message:', userData.message);
      console.log('Update count:', userData.update_count.toString());
      console.log('---------------------');
      console.log('\nHint: Run "npm run update" to update the message');
    } else {
      console.log('\nAccount not found or not initialized');
      console.log('\nHint: Run "npm run initialize" to create a new account');
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
