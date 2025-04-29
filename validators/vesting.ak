use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/interval.{Finite, PosixTime}
use aiken/primitive/string
use cardano/transaction.{OutputReference, Transaction, TxIn}

pub type Datum {
  owner: VerificationKeyHash,
  deadline: PosixTime,
}

pub type Redeemer {}

validator vesting {
  spend(
    datum: Option<Datum>,
    _redeemer: Redeemer,
    _own_ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(Datum { owner, deadline }) = datum

    // Check if transaction is signed by the owner
    let is_signed = list.has(self.extra_signatories, owner)

    // Check if current time is past the deadline
    let Finite(before) = self.time_range.upper_bound
    let is_after_deadline = before > deadline

    trace @"is_signed": string.from_bool(is_signed)
    trace @"is_after_deadline": string.from_bool(is_after_deadline)

    is_signed? && is_after_deadline?
  }
}

test vesting_example() {
  let datum =
    Datum {
      owner: #"00000000000000000000000000000000000000000000000000000000",
      deadline: 1735689600000, // Jan 1, 2025, 00:00 UTC
    }

  let placeholder_utxo = OutputReference { transaction_id: "", output_index: 0 }

  vesting.spend(
    Some(datum),
    Redeemer {},
    placeholder_utxo,
    Transaction {
      ..transaction.placeholder,
      extra_signatories: [datum.owner],
      time_range: interval.from(1735689601000), // Just after deadline
    },
  )
}