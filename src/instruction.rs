use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::instruction::{AccountMeta, Instruction};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum AccountDemoInstruction {
    /// Initialize a new UserData account
    /// 
    /// Accounts expected:
    /// 0. `[signer, writable]` The account owner
    /// 1. `[writable]` The UserData account to initialize
    /// 2. `[]` The rent sysvar
    /// 3. `[]` The system program
    Initialize { name: String, message: String },
    
    /// Update the message in a UserData account
    /// 
    /// Accounts expected:
    /// 0. `[signer]` The account owner
    /// 1. `[writable]` The UserData account to update
    UpdateMessage { message: String },
}

impl AccountDemoInstruction {
    pub fn initialize(
        program_id: &Pubkey,
        owner: &Pubkey,
        user_data_account: &Pubkey,
        name: String,
        message: String,
    ) -> Instruction {
        let data = AccountDemoInstruction::Initialize { name, message };
        let data = data.try_to_vec().unwrap();

        Instruction {
            program_id: *program_id,
            accounts: vec![
                AccountMeta::new(*owner, true),
                AccountMeta::new(*user_data_account, false),
                AccountMeta::new_readonly(solana_program::sysvar::rent::id(), false),
                AccountMeta::new_readonly(solana_program::system_program::id(), false),
            ],
            data,
        }
    }

    pub fn update_message(
        program_id: &Pubkey,
        owner: &Pubkey,
        user_data_account: &Pubkey,
        message: String,
    ) -> Instruction {
        let data = AccountDemoInstruction::UpdateMessage { message };
        let data = data.try_to_vec().unwrap();

        Instruction {
            program_id: *program_id,
            accounts: vec![
                AccountMeta::new_readonly(*owner, true),
                AccountMeta::new(*user_data_account, false),
            ],
            data,
        }
    }
}
