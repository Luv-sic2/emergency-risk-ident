export default async function handler(req, res) {
    // 跨域头双重保险
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const apiKey = process.env.DEEPSEEK_KEY;
    if (!apiKey) {
        return res.status(200).json({ content: "⚠️ [系统提示] 未检测到密钥！请去 Vercel 后台配置环境便利 DEEPSEEK_KEY。" });
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
        const now = new Date();
        const currentDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

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
                                    text: `你是一个专业的校园安全与应急管理专家。请仔细观察这张用户上传的校园现场实拍照片，根据你真实看到的画面内容，拒绝任何无根据的瞎编，实时生成一份针对该场景的专业隐患排查报告。\n\n报告必须严格包含以下四个板块：\n1. 【现场态势感知】：描述你在这张照片里真实看到的场景、物体，并明确指出画面的主体和潜在的不安全迹象（例如：看到电动车无序停放、看到杂物堆积、或者是正常的校园设施。如果没有明显隐患，请从日常防范性排查的角度说明）。\n2. 【核心风险评估】：根据画面内容，从消防安全、电气设施、人流交通冲突或高空坠物等维度中，选出最贴合这张照片的2个维度进行深度风险剖析。\n3. 【突发事件预防对策】：结合应急管理专业知识，针对照片中的真实情况给出具体、可操作的整改和防范建议。\n4. 【应急响应评级】：结合隐患严重程度，给出一个合理的临时响应评级（如蓝色Ⅳ级预警、黄色Ⅲ级预警等）并简要说明理由。\n\n评估基准时间必须为：${currentDate}。请多用换行和加粗，使其排版像一份正式的官方文件。`
                                },
                                {
                                    image: `data:image/jpeg;base64,${base64Image}`
                                }
                            ]
                        }
                    ]
                }
            })
        });

        const data = await response.json();

        if (data.output && data.output.choices && data.output.choices[0] && data.output.choices[0].message) {
            return res.status(200).json({ content: data.output.choices[0].message.content[0].text });
        } else {
            return res.status(200).json({ content: "⚠️ 国内AI视觉节点返回异常，请确认百炼平台的 Key 是否已在 Vercel 中填对。\n官方原版错误：" + JSON.stringify(data) });
        }
    } catch (error) {
        return res.status(200).json({ content: "❌ [国内视觉节点连接失败]: " + error.message });
    }
}
