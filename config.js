module.exports = {
    suiTokenAddress: "0x2::sui::SUI", //sio token address
    otherTokenAddress: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC", //other token address
    suiTokenDecimals: 9,
    otherTokenDecimals: 6,
    poolAddress: "0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105", //pool address to perform trade on
    amountIn: 100000000, //amount to distribute in temp wallets
    tradeAmount: 10000000, //amount to trade
    slippage: 0.1, //swap slippage
    globalRecursionCount: 2, //number of times to fully run the loop of creating wallets and executing swaps, set -1 for infinite
    walletCount: 2, //number of wallets to generate
    walletFilePath: './assets/wallets.json', //wallets saving path
    mainWalletFilePath: './assets/mainWallets.json', //parent wallets saving path

    tradeCountPerWallet: 2, //number of times to reuse a wallet
    swapGasFee: 3889592, //swap gas fee
    transferGasFee: 3476000, //transfer gas fee
    minNewTradeTime: 10, //min seconds for next trade cycle
    maxNewTradeTime: 15, //max seconds for next trade cycle
    leaveNativeTokenPercent: 0, //leave some swap token in generated wallets
    leftAmountWhenleaveNativeTokenPercent: 6000000,

    // changeMainWalletRecursion: 2//change main wallet after how many recursions

}