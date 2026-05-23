export default async function handler(req, res) {
  // 跨域通行证
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const auth = process.env.DEEPSEEK_KEY; 
  if (!auth) {
    return res.status(200).json({ content: "⚠️ 错误：未检测到 DEEPSEEK_KEY。" });
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "model": "deepseek-chat",
        "messages": [
          {
            "role": "system", 
            // 💡 核心修改：利用系统提示词，死死框住 AI 的输出格式
            "content": `你是一名资深的应急管理专家。请对上传的校园场景照片进行快速视觉评估。
严格要求：绝对禁止任何寒暄、开场白或结尾！必须、且只能按照以下固定模板输出（严禁修改模板标题）：

【检测区域】（一句话概括画面主体，如：室内走廊/室外操场/设备室等）
【隐患类别】（从 消防/用电/交通/基建设施 中选填）
【风险等级】（选填：🔴 重大风险 / 🟡 一般风险 / 🟢 低风险）
【问题表现】（限20字内，精准指出视觉上的安全漏洞）
【整改建议】（限20字内，给出专业操作措施）`
          },
          {
            "role": "user", 
            "content": "请执行视觉测算，并严格按预设模板输出报告。"
          }
        ],
        "temperature": 0.1 // 💡 温度值降到极低 (0.1)，彻底消除 AI 的发散性，让它变成纯粹的填空机器
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      return res.status(200).json({ content: data.choices[0].message.content });
    } else {
      return res.status(200).json({ content: "⚠️ AI 解析异常，请稍后重试。" });
    }

  } catch (error) {
    return res.status(200).json({ content: "⚠️ 节点通信故障，请检查网络。" });
  }
}
