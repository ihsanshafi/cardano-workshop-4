import * as fs from "node:fs";
import {
  BlockfrostProvider,
  MeshTxBuilder,
  MeshWallet,
  serializePlutusScript,
  UTxO,
} from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core-csl";
import blueprint from "./plutus.json";

const blockchainProvider = new BlockfrostProvider(
  process.env.BLOCKFROST_PROJECT_ID!
);

// Wallet for signing transactions
const wallet = new MeshWallet({
  networkId: 0, // Preview testnet
  fetcher: blockchainProvider,
  submitter: blockchainProvider,
  key: {
    type: "root",
    bech32: fs.readFileSync("me.sk").toString(),
  },
});

// Get validator script and address
function getScript() {
  const scriptCbor = applyParamsToScript(
    blueprint.validators[0].compiledCode,
    []
  );
  const scriptAddr = serializePlutusScript(
    { code: scriptCbor, version: "V3" },
    undefined,
    0 // Preview testnet
  ).address;
  return { scriptCbor, scriptAddr };
}

// Get transaction builder
function getTxBuilder() {
  return new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
  });
}

// Blockfrost API workaround for getUtxo issue
async function getUtxoFromBlockfrost(
  txHash: string,
  scriptAddr: string
): Promise<UTxO> {
  const response = await fetch(
    `https://cardano-preview.blockfrost.io/api/v0/addresses/${scriptAddr}/utxos`,
    {
      headers: { project_id: process.env.BLOCKFROST_PROJECT_ID! },
    }
  );
  const utxos = await response.json();
  const utxo = utxos.find((u: any) => u.tx_hash === txHash);
  if (!utxo) throw new Error(`UTxO not found for transaction ${txHash}`);

  return {
    input: {
      outputIndex: utxo.output_index,
      transactionId: utxo.tx_hash,
    },
    output: {
      address: scriptAddr,
      amount: utxo.amount.map((a: any) => ({
        unit: a.unit,
        quantity: a.quantity,
      })),
    },
  };
}

// Get UTxO by transaction hash
async function getUtxo(txHash: string, scriptAddr: string): Promise<UTxO> {
  try {
    const utxos = await wallet.getUtxos();
    const utxo = utxos.find((u) => u.input.transactionId === txHash);
    if (utxo) return utxo;
    console.warn(
      "Mesh getUtxos returned empty, falling back to Blockfrost API"
    );
    return await getUtxoFromBlockfrost(txHash, scriptAddr);
  } catch (error) {
    console.warn("Mesh getUtxos failed, using Blockfrost API");
    return await getUtxoFromBlockfrost(txHash, scriptAddr);
  }
}

// Unlock funds
async function unlock(txHash: string) {
  const { scriptCbor, scriptAddr } = getScript();
  const txBuilder = getTxBuilder();
  const walletAddress = wallet.getUsedAddresses()[0];
  const owner = wallet.getPaymentCredential().hash;

  const utxo = await getUtxo(txHash, scriptAddr);
  const adaAmount =
    utxo.output.amount.find((a) => a.unit === "lovelace")?.quantity || "0";

  const tx = await txBuilder
    .spendingPlutusScriptV3()
    .txIn(utxo.input.transactionId, utxo.input.outputIndex)
    .txInScript(scriptCbor)
    .txInDatumValue({
      owner: `keyHash-${owner}`,
      deadline: 1735689600000, // Jan 1, 2025
    })
    .txInRedeemerValue({})
    .requiredSignerHash(owner)
    .changeAddress(walletAddress)
    .selectUtxosFrom(await wallet.getUtxos())
    .complete();

  const signedTx = await wallet.signTx(tx);
  const finalTxHash = await wallet.submitTx(signedTx);

  // Convert lovelace to ADA
  const adaUnlocked = parseInt(adaAmount) / 1_000_000;
  console.log(
    `Successfully unlocked ${adaUnlocked} tADA from the vesting contract\n\tTx ID: ${finalTxHash}`
  );
}

const txHash = process.argv[2];
if (!txHash) {
  console.error(
    "Please provide the transaction hash: npx ts-node unlock-funds.ts <tx_hash>"
  );
  process.exit(1);
}

unlock(txHash).catch(console.error);
