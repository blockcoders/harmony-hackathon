import { Unit } from "@harmony-js/utils";
import { Transaction } from "@harmony-js/transaction";
import {
  PrivateKey,
  HarmonyShards,
  HRC721,
  ContractProviderType,
  BaseContract,
} from "harmony-marketplace-sdk";
import { readFile } from "fs";
import { join } from "path";

const PRIVATE_KEY =
  "4b28f8aece00c52ea7dab16d6297f9aa29f71b0e0c2707779f54cbe417078b17";
const OWNER_PK =
  "1fc15e16a5b8c7d2b1568a7a860dd2326d93206438b6f789e803cbbb58f23b86";

const WALLET = new PrivateKey(HarmonyShards.SHARD_0_DEVNET, PRIVATE_KEY, 4);
const OWNER_WALLET = new PrivateKey(HarmonyShards.SHARD_0_DEVNET, OWNER_PK, 4);

const WALLET_ADDRESS = WALLET.accounts[0].toLowerCase();
const OWNER_ADDRESS = OWNER_WALLET.accounts[0].toLowerCase();

const namesMap = new Map<string, string>();
namesMap.set(WALLET_ADDRESS, "Walter White");
namesMap.set(OWNER_ADDRESS, "Saul Goodman");

const DEFAULT_GAS = {
  gasPrice: new Unit("30").asGwei().toWei(),
  gasLimit: 3500000,
};

const TOKEN_ID = 1;
const NAME = "Blockcoders NFT";
const SYMBOL = "Blockcoders";
const TOKEN_URI = "https://www.fakeURI.com";

class DeployContract extends BaseContract {
  constructor(abi: any[], wallet: ContractProviderType) {
    super("0x", abi, wallet);
  }

  public deploy(bytecode: string, args: any[] = []): Promise<Transaction> {
    return this.send(
      "contractConstructor",
      [{ data: bytecode, arguments: args }],
      DEFAULT_GAS
    );
  }
}

export async function getContractMetadata(): Promise<{
  abi: any[];
  bytecode: any;
}> {
  return new Promise((res, rej) => {
    readFile(`${join(__dirname, `./HRC721.json`)}`, "utf8", (err, data) => {
      if (err) rej(err);
      const metadata = JSON.parse(data);
      res({ abi: metadata.abi, bytecode: metadata.bytecode });
    });
  });
}

export async function deployContract(
  wallet: ContractProviderType,
  args: any[] = []
): Promise<{ addr: string; abi: any[] }> {
  const { abi, bytecode } = await getContractMetadata();
  const contract = new DeployContract(abi, wallet);
  const tx = await contract.deploy(bytecode, args);
  const addr = tx?.receipt?.contractAddress?.toLowerCase() ?? "";
  return { addr, abi };
}

async function main() {
  console.log("\n================= Let's play with NFTs =================");
  console.log("\nPRE-REQUISITES:");
  console.log("\tHave a contract deployed (abi and address)");
  console.log("\tHave a wallet with some funds");
  console.log("\tMint a token to your wallet");

  console.log("\nDeploying NFT (HRC721) contract...");
  const hrc721 = await deployContract(WALLET, [NAME, SYMBOL, TOKEN_URI]);
  console.log(`\tHRC721 - Deployed on address: ${hrc721.addr}`);

  // Calls to the contract signed by the WALLET
  const contract = new HRC721(hrc721.addr, hrc721.abi, WALLET);
  // Calls to the contract signed by the OWNER_WALLET
  const ownerSignedContract = new HRC721(hrc721.addr, hrc721.abi, OWNER_WALLET);

  const mintTx = await contract.mint(OWNER_ADDRESS, TOKEN_ID, DEFAULT_GAS);
  console.log("\tHRC721 - Mint transaction hash: ", mintTx.id);

  const owner = await contract.ownerOf(TOKEN_ID);
  console.log(
    `\tHRC721 - The owner of the token with id ${TOKEN_ID} is ${namesMap.get(owner.toLowerCase())}`
  );

  console.log("\nLet's call some methods...");

  const balance = await contract.balanceOf(OWNER_ADDRESS);
  console.log(`\tHRC721 - Balance of ${namesMap.get(OWNER_ADDRESS)} is ${balance} token(s)`);

  const uri = await contract.tokenURI(TOKEN_ID);
  console.log(`\tHRC721 - Token URI: ${uri}`);

  const symbol = await contract.symbol();
  console.log(`\tHRC721 - Symbol: ${symbol}`);

  const name = await contract.name();
  console.log(`\tHRC721 - Name: ${name}`);

  console.log("\nLet's transfer the token to another address...");

  // Same as before, but signed by the owner
  const balanceOfOwner = await ownerSignedContract.balanceOf(OWNER_ADDRESS);
  console.log(
    `\tHRC721 - Balance of ${namesMap.get(OWNER_ADDRESS)} is ${balanceOfOwner} token(s)`
  );

  await ownerSignedContract.approve(WALLET_ADDRESS, TOKEN_ID, DEFAULT_GAS);
  console.log(
    `\tHRC721 - Approved ${namesMap.get(WALLET_ADDRESS)} to transfer tokenId ${TOKEN_ID}`
  );

  await contract.transferFrom(
    OWNER_ADDRESS,
    WALLET_ADDRESS,
    TOKEN_ID,
    DEFAULT_GAS
  );
  console.log(
    `\tHRC721 - Transferred token with id ${TOKEN_ID} from ${namesMap.get(OWNER_ADDRESS)} to ${namesMap.get(WALLET_ADDRESS)}`
  );

  const newOwner = await contract.ownerOf(TOKEN_ID);
  console.log(
    `\tHRC721 - The new owner of the token with id ${TOKEN_ID} is ${namesMap.get(newOwner.toLowerCase())}`
  );

  console.log("\nLet's burn the token");
  const burnTx = await contract.burn(TOKEN_ID);
  console.log("\tHRC721 - Burn transaction hash: ", burnTx.id);
}

main().catch(console.error);
