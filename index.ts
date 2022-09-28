import { HttpProvider } from "@harmony-js/network";
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
  process.env.PRIVATE_KEY ||
  "4b28f8aece00c52ea7dab16d6297f9aa29f71b0e0c2707779f54cbe417078b17";

const NAME = "Blockcoders NFT";
const SYMBOL = "Blockcoders";
const TOKEN_URI = "https://www.fakeURI.com";

const WALLET = new PrivateKey(
  HarmonyShards.SHARD_0_DEVNET,
  PRIVATE_KEY,
  4
);
class DeployContract extends BaseContract {
  constructor(abi: any[], wallet: ContractProviderType) {
    super("0x", abi, wallet);
  }

  public deploy(bytecode: string, args: any[] = []): Promise<Transaction> {
    console.log("Deploy with args", args);
    return this.send(
      "contractConstructor",
      [{ data: bytecode, arguments: args }],
      {
        gasPrice: new Unit("30").asGwei().toWei(),
        gasLimit: 3500000,
      }
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

  console.info(`HRC721 deployed on address: ${addr}`);

  return { addr, abi };
}

async function main() {
  const hrc721 = await deployContract(WALLET, [NAME, SYMBOL, TOKEN_URI]);
  // A contract instance
  const contract = new HRC721(hrc721.addr, hrc721.abi, WALLET);

  const mintTx = await contract.mint(WALLET.accounts[0].toLowerCase(), 1, {
    gasPrice: new Unit('30').asGwei().toWei(),
    gasLimit: 3500000,
  })
  console.info('HRC721 mint tx hash: ', mintTx.id)
  
  // returns a string value.
  const owner = await contract.ownerOf("1");

  console.log(owner);
}

main().catch(console.error);
