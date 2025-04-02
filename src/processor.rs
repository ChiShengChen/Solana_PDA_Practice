use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};

use crate::{
    error::AccountDemoError,
    instruction::AccountDemoInstruction,
    state::{UserData, StringPad},
};

pub struct Processor;

impl Processor {
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        msg!("Processing instruction with data: {:?}", instruction_data);
        let instruction = AccountDemoInstruction::try_from_slice(instruction_data)
            .map_err(|err| {
                msg!("Failed to deserialize instruction: {:?}", err);
                AccountDemoError::InvalidInstructionData
            })?;

        match instruction {
            AccountDemoInstruction::Initialize { name, message } => {
                msg!("Instruction: Initialize {{ name: {}, message: {} }}", name, message);
                Self::process_initialize(program_id, accounts, name, message)
            }
            AccountDemoInstruction::UpdateMessage { message } => {
                msg!("Instruction: UpdateMessage {{ message: {} }}", message);
                Self::process_update_message(accounts, message)
            }
        }
    }

    fn process_initialize(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        name: String,
        message: String,
    ) -> ProgramResult {
        let accounts_iter = &mut accounts.iter();
        
        // Get accounts
        let user_account = next_account_info(accounts_iter)?;
        let user_data_account = next_account_info(accounts_iter)?;
        let rent_account = next_account_info(accounts_iter)?;
        let system_program = next_account_info(accounts_iter)?;
        
        // Verify account ownership
        if user_data_account.owner != program_id && !user_data_account.data_is_empty() {
            return Err(ProgramError::IncorrectProgramId);
        }
        
        // Check if user is signer
        if !user_account.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        
        // Get rent sysvar
        let rent = Rent::from_account_info(rent_account)?;
        
        // Calculate account size and rent
        let data_size = UserData::get_size(&name, &message);
        let lamports_required = rent.minimum_balance(data_size);
        
        // Create account if it doesn't exist
        if user_data_account.data_is_empty() {
            msg!("Creating user data account...");
            
            // Verify the account is a PDA
            let (expected_address, bump) = Pubkey::find_program_address(
                &[b"user-data", user_account.key.as_ref()],
                program_id,
            );
            
            if expected_address != *user_data_account.key {
                msg!("Error: Account is not a PDA");
                return Err(ProgramError::InvalidArgument);
            }
            
            msg!("Creating account with {} bytes", data_size);
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
            
            msg!("Account created successfully");
        } else {
            msg!("Account already exists");
        }
        
        // Initialize account data
        let account_data = UserData::new(*user_account.key, name, message)?;
        let mut data = user_data_account.data.borrow_mut();
        account_data.serialize(&mut &mut data[..])?;
        
        msg!("Account data initialized successfully");
        
        Ok(())
    }

    fn process_update_message(
        accounts: &[AccountInfo],
        message: String,
    ) -> ProgramResult {
        let accounts_iter = &mut accounts.iter();
        
        // Get accounts
        let user_account = next_account_info(accounts_iter)?;
        let user_data_account = next_account_info(accounts_iter)?;
        
        msg!("Processing update message for user: {}", user_account.key);
        msg!("User data account: {}", user_data_account.key);
        
        // Check if user is signer
        if !user_account.is_signer {
            msg!("Error: User is not a signer");
            return Err(ProgramError::MissingRequiredSignature);
        }
        
        // Log account data
        let account_data = user_data_account.data.borrow();
        msg!("Account data length: {}", account_data.len());
        msg!("Account data: {:?}", account_data);
        
        // Deserialize account data
        msg!("Attempting to deserialize account data...");
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
        
        // Check if account is initialized
        msg!("Checking if account is initialized...");
        if !user_data.is_initialized {
            msg!("Error: Account is not initialized");
            return Err(AccountDemoError::NotInitialized.into());
        }
        
        // Check if user is the owner of the account
        msg!("Checking account ownership...");
        let owner = user_data.get_owner();
        msg!("Account owner: {}", owner);
        msg!("User account: {}", user_account.key);
        if owner != *user_account.key {
            msg!("Error: User is not the account owner");
            return Err(AccountDemoError::NotOwner.into());
        }
        
        // Check message length
        if message.len() > UserData::MAX_MESSAGE_LENGTH {
            msg!("Error: Message too long");
            return Err(AccountDemoError::MessageTooLong.into());
        }
        
        // Calculate required account size
        let required_size = UserData::get_size(&user_data.name, &message);
        if required_size > account_data.len() {
            msg!("Error: Account size too small. Required: {}, Available: {}", required_size, account_data.len());
            return Err(ProgramError::AccountDataTooSmall);
        }
        
        // Update message and counter
        msg!("Updating message and counter...");
        user_data.message = message;
        user_data.update_count += 1;
        
        // Save updated data back to account
        msg!("Saving updated data back to account...");
        let mut data = user_data_account.data.borrow_mut();
        user_data.serialize(&mut &mut data[..])?;
        
        msg!("User data message updated successfully");
        Ok(())
    }
}
