//later strategy discussed where we do swpa from one wallet and shift to next and then again do swaps etc

const { createSigner, createWallets, createSignerWithSecretKey } = require("./cetus/keypair");
const { getClmmPools, getPresSwapOutput, swap } = require("./cetus/swap");
const { getBalance, transfer, batchTransferWithSameFromAddress } = require("./cetus/utils");
// const config = require("./config");
const { saveJsonToFile, getJson, saveJsonRewrite } = require("./helpers/storage");
const database = require("./db/pg.js");



// const suiToken = "0x2::sui::SUI";
// const suiTokenDecimals = 9
// const otherTokenAddress = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";
// const otherTokenDecimals = 6;
// const poolAddress = "0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105"
// const amountIn = 100000000
// const slippage = 0.1

const BigNumber = require("bignumber.js");
const { getActiveWallet, updateInactiveWallets, insertActiveWallet, getAllConfigs, insertSwapTransaction } = require("./db/dbQueries.js");
const subtractBigNumber = (x, y) => new BigNumber(x).minus(new BigNumber(y)).toString();


function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const generateNewMainWallet = async () => {
    console.log("Initiate changing of main wallet");
    const newMainWallets = createWallets(1);
    // const mainWalletJson = await getJson(config?.mainWalletFilePath);
    // for (let wallet of mainWalletJson) {
    //     wallet["isactive"] = false
    // }
    let mainWallet;
    for (let wallet of newMainWallets) {
        //     mainWalletJson.push(wallet);
        mainWallet = wallet;
    }
    // await saveJsonRewrite(mainWalletJson, config?.mainWalletFilePath);

    await updateInactiveWallets();
    await insertActiveWallet(mainWallet?.publicKey, mainWallet?.privateKey);
    return mainWallet;


}

const retrievingFunds = async (wallet, mainWallet, config) => {
    // console.log("Initiating ", wallets.length)
    const balance = await getBalance(wallet?.publickey, config?.suiTokenAddress);
    console.log("Balance: ", balance);
    console.log(Number(subtractBigNumber(balance.toString(), config?.transferGasFee.toString())));
    // console.log(mainWallet, wallet)
    // const tx = await transfer(wallets[i]?.publickey, config?.baseAddress, config?.suiTokenAddress, Number(balance.toString()), createSignerWithSecretKey(wallets[i].privatekey));
    let tx;
    if (Number(config?.leaveNativeTokenPercent) > 0) {
        tx = await transfer(wallet?.publickey, mainWallet?.publicKey, config?.suiTokenAddress, Number(subtractBigNumber(balance.toString(), config?.leftAmountWhenleaveNativeTokenPercent.toString())), createSignerWithSecretKey(wallet.privatekey));
    } else {
        tx = await transfer(wallet?.publickey, mainWallet?.publicKey, config?.suiTokenAddress, Number(subtractBigNumber(balance.toString(), config?.transferGasFee.toString())), createSignerWithSecretKey(wallet.privatekey));
    }
    console.log(`Transferred ${tx} from wallet ${wallet.publickey}`);
    wallet.isactive = false;

    // console.log(wallets)
    return wallet;
}


const initiateSwapping = async (mainWallet, config) => {
    for (let k = 0; k < Number(config?.tradeCountPerWallet); k++) {
        const time = (Math.floor(Math.random() * (Number(config?.maxNewTradeTime) - Number(config?.minNewTradeTime) + 1)) + Number(config?.minNewTradeTime)) * 1000;
        console.log(`Sleeping for ${time}`);
        
        await sleep(time);
        console.log(`Initiating Swaps on both sides for wallet: ${mainWallet.publickey}`);
        const signer = createSignerWithSecretKey(mainWallet?.privatekey);


        const [nativeTokenBalance, otherTokenBalance] = await Promise.all([getBalance(mainWallet?.publickey, config?.suiTokenAddress), getBalance(mainWallet?.publickey, config?.otherTokenAddress)]);
        console.log(`Total Balance Now 1: Sui token: ${nativeTokenBalance}, other token: ${otherTokenBalance}`);
       
        const start = new Date()
        const buyTx = await swap(config?.poolAddress, Number(config?.tradeAmount), Number(config?.slippage), config?.otherTokenAddress, true, signer, mainWallet?.publickey, nativeTokenBalance, nativeTokenBalance, config);
        console.log(`Transaction Signature: ${buyTx}`);

        const [newNativeTokenBalance1, newOtherTokenBalance1] = await Promise.all([getBalance(mainWallet?.publickey, config?.suiTokenAddress), getBalance(mainWallet?.publickey, config?.otherTokenAddress)]);
        console.log(`Total Balance Now 2: Sui token: ${newNativeTokenBalance1}, other token: ${newOtherTokenBalance1}`);

        const sellTx = await swap(config?.poolAddress, Math.floor(Number(subtractBigNumber(newOtherTokenBalance1.toString(), (newOtherTokenBalance1 * (Number(config?.leaveNativeTokenPercent) / 100)).toString()))), Number(config?.slippage), config?.otherTokenAddress, false, signer, mainWallet?.publickey, newOtherTokenBalance1, newNativeTokenBalance1, config);
        console.log(`Transaction Signature: ${sellTx}`);
        const end = new Date();

        const [newNativeTokenBalance2, newOtherTokenBalance2] = await Promise.all([getBalance(mainWallet?.publickey, config?.suiTokenAddress), getBalance(mainWallet?.publickey, config?.otherTokenAddress)]);
        console.log(`Total Balance Now 3: Sui token: ${newNativeTokenBalance2}, other token: ${newOtherTokenBalance2}`);


        console.log(`Time taken: ${end - start}`);
        // await saveJsonToFile([{
        //     buyTx: buyTx,
        //     sellTx: sellTx,
        //     timeTaken: end - start
        // }], './assets/transactions.json');
        await insertSwapTransaction(buyTx, sellTx, end-start, ((newNativeTokenBalance2-nativeTokenBalance)/10**9).toString());
    }

    console.log("Initiating collection of funds and generating on new wallets");
    const newMainWallet = await generateNewMainWallet();
    const updatedWallet = await retrievingFunds(mainWallet, newMainWallet, config);
    return {
        newMainWallet: newMainWallet,
        updatedWallet: updatedWallet
    };
}




const runVolumeBot = async () => {
    console.log("[Initializing]");

    const mainWalletJson = await getActiveWallet();
    console.log(mainWalletJson.length);

    // let mainWallet = {}
    if (mainWalletJson.length <= 0) {
        throw new Error("No active wallets");
    }
    let mainWallet = mainWalletJson[0];

    if (!mainWallet?.isactive) {
        throw new Error("No main Wallet is Active");
    }
    const dbConfigs = await getAllConfigs();
    if (dbConfigs.length <= 0) {
        throw new Error("No active config");
    }
    let dbJson = dbConfigs.reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
    }, {});

    let globalCount = 0;
    let globalRecursionCount = Number(dbJson?.globalRecursionCount);
    while (globalCount < globalRecursionCount) {
        console.log("Initiating Swaps");

        const updatedData = await initiateSwapping(mainWallet, dbJson);
        
        console.log("[Done]: ", globalCount);

        globalCount++;
        if (Number(dbJson?.globalRecursionCount) === -1) {
            globalRecursionCount += 1;
        }
        mainWallet = updatedData?.newMainWallet;
        const dbConfigs2 = await getAllConfigs();
        if (dbConfigs2.length <= 0) {
            throw new Error("No active config");
        }
        dbJson = dbConfigs2.reduce((acc, { key, value }) => {
            acc[key] = value;
            return acc;
        }, {});

    }




    // await getPresSwapOutput(config.poolAddress, config.amountIn.toString(), config.slippage.toString(), config.otherTokenAddress, true);
    // await getBalance("0xb225f7b2d4676ae8f691cbf6fcf8b32d75b55531e87fb806f5a7fffe64b52876", config.otherTokenAddress);
    // await transfer(config.baseAddress, config.baseAddress, config.suiTokenAddress, 1000);

    // createWallets(1);

    // const batchTransferData = [
    //     {
    //         to: config.baseAddress,
    //         amount: 100000
    //     },
    //     {
    //         to: config.baseAddress,
    //         amount: 150000
    //     }
    // ]

    // await batchTransferWithSameFromAddress(batchTransferData, config.baseAddress, config.suiTokenAddress);
}

// runVolumeBot()


const main = async () => {
    try {
        console.log("gere")
        await database.initialize();
        await runVolumeBot();
    } catch (err) {
        console.log(err);
    }
}
main()

// const tranr = async () => {
//     const updatedWallets = [
//         {
//             "privatekey": "suiprivkey1qpe9gys2ua57v9uqzmqjazv2nhqkaz4aaxdmpt0lplujl4czqdf9gc505k3",
//             "publickey": "0xc73c2e77385d87699e88234d0662339df7c8070617e5dd2053324415dafa7cb5",
//             "isactive": false
//         }
//     ]
//     const data = await getJson(config?.walletFilePath);
//     for (let wallet of updatedWallets) {
//         const foundObject = data.find(obj => obj["publickey"] === wallet?.publickey);
//         if (foundObject) {
//             foundObject["isactive"] = wallet?.isactive;
//         } else {
//             data.push(wallet)
//         }
//     }

//     await saveJsonRewrite(data, config?.walletFilePath);
// }

// tranr()



// const runtrial = async (wallets) => {
//     const start = new Date()
//     const [newNativeTokenBalance, newOtherTokenBalance] = await Promise.all([getBalance(wallets.publickey, config?.suiTokenAddress), getBalance(wallets.publickey, config?.otherTokenAddress)]);
//     console.log(`Total Balance Now: Sui token: ${newNativeTokenBalance}, other token: ${newOtherTokenBalance}`);
//     const signer = createSignerWithSecretKey(wallets?.privatekey);

//     const buyTx = await swap(config?.poolAddress, config?.amountIn, config?.slippage, config?.otherTokenAddress, true, signer, wallets?.publickey, newNativeTokenBalance, newNativeTokenBalance);
//     console.log(`Transaction Signature: ${buyTx}`);

//     const [newNativeTokenBalance1, newOtherTokenBalance1] = await Promise.all([getBalance(wallets.publickey, config?.suiTokenAddress), getBalance(wallets.publickey, config?.otherTokenAddress)]);
//     console.log(`Total Balance Now: Sui token: ${newNativeTokenBalance1}, other token: ${newOtherTokenBalance1}`);

//     const sellTx = await swap(config?.poolAddress, newOtherTokenBalance1, config?.slippage, config?.otherTokenAddress, false, signer, wallets?.publickey, newOtherTokenBalance1, newNativeTokenBalance1);
//     console.log(`Transaction Signature: ${sellTx}`);

//     const [newNativeTokenBalance2, newOtherTokenBalance2] = await Promise.all([getBalance(wallets.publickey, config?.suiTokenAddress), getBalance(wallets.publickey, config?.otherTokenAddress)]);
//     console.log(`Total Balance Now: Sui token: ${newNativeTokenBalance2}, other token: ${newOtherTokenBalance2}`);
//     const end = new Date();
//     console.log(`Time taken: ${end - start}`)

// }

// runtrial(
//     {
//         "privatekey": "suiprivkey1qzklz29a2qxyh8npv2djgnmpyh7l7st7gu60z9m33andzwpwreecxegdfr2",
//         "publickey": "0xcd95fcf8b8c8ac65fc53ce18cd40ec525b60c54bcd57d215745cbaa4e808b0e8",
//         "isactive": true
//     }
// )
