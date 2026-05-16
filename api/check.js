export default async function handler(req, res) {
    // 基础防爆跨域头设置
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 读取全局变量里的 API 钥匙
    const apiKey = process.env.DEEPSEEK_KEY;
    if (!apiKey) {
        return res.status(200).json({ 
            content: "⚠️ [系统提示] Vercel 后端未检测到 DEEPSEEK_KEY 密钥！\n\n请前往你的 Vercel 项目控制台：\nSettings -> Environment Variables，添加一个名为 DEEPSEEK_KEY 的变量。保存后请务必执行一遍 Redeploy（重新部署）！" 
        });
    }

    try {
        // 请求大模型大脑，为其量身定做应急管理专业的报告格式
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { 
                        "role": "system", 
                        "content": "你是一个校园安全与应急管理专家。请针对用户提交的场景，输出一份结构严谨、排版漂亮的校园安全评估报告。报告必须包含以下四个板块：\n1. 【现场态势感知】（描述模拟发现的隐患现象）\n2. 【核心风险评估】（从消防安全、电气设施、人流交通冲突中任选2类做深度剖析）\n3. 【突发事件预防对策】（给出应急专业、具体的整改建议）\n4. 【应急响应评级】（给出一个推荐的响应级别，如Ⅳ级、Ⅲ级及简要理由）。请多用换行，让整份报告看起来像官方专业文件。" 
                    },
                    { "role": "user", "content": "请对该校园区域执行全方位数字化隐患排查，生成专业评估报告。" }
                ],
                temperature: 0.6
            })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
            return res.status(200).json({ content: data.choices[0].message.content });
        } else {
            return res.status(200).json({ content: "⚠️ AI 节点连接成功，但未返回文本。请确认您的大模型账户中是否有余额，或者 Key 是否被官方停用。\n官方原版报错：" + JSON.stringify(data) });
        }
    } catch (error) {
        return res.status(200).json({ content: "❌ [中转故障] 后台请求 AI 服务器超时或失败: " + error.message });
    }
}
