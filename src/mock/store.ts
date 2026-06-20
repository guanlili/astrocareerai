// 兼容入口：统一 Mock 状态层已收敛到 ./appStore（三端唯一真相源）。
//
// 历史：admin / teacher 路由曾直接从本文件消费 useMockState / setReviewStatus /
// requestRefund / teacherEarnings 等。为避免改动这些路由的导入路径，本文件保留为
// 对 ./appStore 的再导出，确保跨端共用同一份状态与 localStorage。
export * from "./appStore";
