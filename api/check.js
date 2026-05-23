export default async function handler(req, res) {
    // 跨域头双重保险
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 读取 Vercel 后台的变量（继续用你设置好的 DEEPSEEK_KEY，省得改）
    const apiKey = process.env.DEEPSEEK_KEY;
    if (!apiKey) {
        return res.status(200).json({ content: "⚠️ [系统提示] 未检测到密钥！请去 Vercel 后台配置环境变量 DEEPSEEK_KEY。" });
    }

    if (req.method !== 'POST' || !req.body) {
        return res.status(200).json({ content: "⚠️ 后端未接收到有效的请求数据。" });
    }

    // 🌟 核心修复：兼容 Vercel 各种形式的数据解析
    let base64Image = "";
    if (req.body) {
        if (typeof req.body === 'string') {
            try {
                const parsed = JSON.parse(req.body);
                if (parsed.image) base64Image = parsed.image;
            } catch (e) {}
        } else if (req.body.image) {
            base64Image = req.body.image;
        }
    }

    // 如果依然拿不到，返回报错提示
    if (!base64Image) {
        return res.status(200).json({ content: "⚠️ 后端未接收到有效的图片数据。请确保上传了真实的图片后再点击按钮。" });
    }

    try {
        // 调用国内最稳多模态模型：通义千问多模态
        const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "qwen-vl-max", 
                input: {
                    messages: [
                        {
                            role: "user",
                            content: [
                                { 
                                    // 💡 核心修改：植入极简且冷酷的固定模板指令
                                    text: `你是一名资深的应急管理专家。请仔细观察这张真实场景照片，执行快速视觉测算。
严格要求：绝对禁止任何寒暄、开场白或结尾！必须、且只能根据你真实看到的画面，按照以下固定模板输出（严禁修改模板标题）：

【检测区域】（一句话概括画面主体，如：室内走廊/室外操场/设备室等）
【隐患类别】（从 消防/用电/交通/基建设施 中选填）
【风险等级】（选填：🔴 重大风险 / 🟡 一般风险 / 🟢 低风险）
【问题表现】（限20字内，精准指出视觉上的安全漏洞）
【整改建议】（限20字内，给出专业操作措施）`
                                },
                                {
                                    image: `data:image/jpeg;base64,${base64Image}` // 真正送入图片的Base64编码
                                }
                            ]
                        }
                    ]
                }
            })
        });

        const data = await response.json();

        // 解析阿里云返回的特有文本格式
        if (data.output && data.output.choices && data.output.choices[0] && data.output.choices[0].message) {
            return res.status(200).json({ content: data.output.choices[0].message.content[0].text });
        } else {
            return res.status(200).json({ content: "⚠️ 国内AI视觉节点返回异常，请确认百炼平台的 Key 是否已在 Vercel 中填对。\n官方原版错误：" + JSON.stringify(data) });
        }
    } catch (error) {
        return res.status(200).json({ content: "❌ [国内视觉节点连接失败]: " + error.message });
    }
}
