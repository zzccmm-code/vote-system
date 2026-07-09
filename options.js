// 成果类别
window._$achievementTypes = [
  {
    id: 1,
    value: "专利奖",
    label: "专利奖",
  },
  { id: 2, value: "科技进步奖", label: "科技进步奖" },
  { id: 3, value: "技术发明奖", label: "技术发明奖" },
];

// 专家评审推荐
window._$recommends = [
  { id: 1, value: "一等奖", label: "一等奖" },
  { id: 2, value: "二等奖", label: "二等奖" },
  { id: 3, value: "三等奖", label: "三等奖" },
];

// 自动适配：本机和平板端自动使用正确的后端地址
// 空字符串 = 相对路径，通过 Node.js 代理转发到后端
window._$base_url = "";
