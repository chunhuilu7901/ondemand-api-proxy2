// OnDemand API适配器 - Cloudflare Workers版本
// 一种在边缘网络中连接不同思维世界的语义翻译层

// API密钥池配置 - 认知的能量来源
const ONDEMAND_APIKEYS = [
    ""
  ];
  const BAD_KEY_RETRY_INTERVAL = 600; // 秒
  
  // 模型映射配置 - 思维空间的坐标系
  const MODEL_MAP = {
    "gpt-4o": "predefined-openai-gpt4o",
    "gpt4o": "predefined-openai-gpt4o",
    "gpt-4o-mini": "predefined-openai-gpt4o-mini",
    "gpt4o-mini": "predefined-openai-gpt4o-mini",
    "deepseek-v3": "predefined-deepseek-v3",
    "deepseek-r1": "predefined-deepseek-r1",
    "gpt-3.5-turbo": "predefined-openai-gpto3-mini",
    "gpt3.5-turbo": "predefined-openai-gpto3-mini",
    "claude-3.7-sonnet": "predefined-claude-3.7-sonnet",
    "gemini-2.0-flash": "predefined-gemini-2.0-flash",
    "gpt-4.1": "predefined-openai-gpt4.1",
    "gpt4.1": "predefined-openai-gpt4.1",
    "gpt-4.1-mini": "predefined-openai-gpt4.1-mini",
    "gpt4.1-mini": "predefined-openai-gpt4.1-mini",
    "gpt-4.1-nano": "predefined-openai-gpt4.1-nano",
    "gpt4.1-nano": "predefined-openai-gpt4.1-nano",
  };
  const DEFAULT_ONDEMAND_MODEL = "predefined-openai-gpt4o";
  const ONDEMAND_API_BASE = "https://api.on-demand.io/chat/v1";
  
  // 密钥管理器 - 认知资源的动态分配系统
  class KeyManager {
    constructor(keyList) {
      this.keyList = [...keyList];
      this.keyStatus = {};
      this.keyList.forEach(k => {
        this.keyStatus[k] = { bad: false, badTs: null };
      });
      this.idx = 0;
    }
  
    displayKey(key) {
      return `${key.slice(0, 6)}...${key.slice(-4)}`;
    }
  
    get() {
      const total = this.keyList.length;
      for (let i = 0; i < total; i++) {
        const key = this.keyList[this.idx];
        this.idx = (this.idx + 1) % total;
        const s = this.keyStatus[key];
        
        if (!s.bad) {
          console.log(`【对话请求】【使用API KEY: ${this.displayKey(key)}】【状态：正常】`);
          return key;
        }
        
        if (s.bad && s.badTs) {
          const ago = Date.now()/1000 - s.badTs;
          if (ago >= BAD_KEY_RETRY_INTERVAL) {
            console.log(`【KEY自动尝试恢复】API KEY: ${this.displayKey(key)} 满足重试周期，标记为正常`);
            this.keyStatus[key].bad = false;
            this.keyStatus[key].badTs = null;
            console.log(`【对话请求】【使用API KEY: ${this.displayKey(key)}】【状态：正常】`);
            return key;
          }
        }
      }
      
      console.log(`【警告】全部KEY已被禁用，强制选用第一个KEY继续尝试: ${this.displayKey(this.keyList[0])}`);
      this.keyList.forEach(k => {
        this.keyStatus[k].bad = false;
        this.keyStatus[k].badTs = null;
      });
      this.idx = 0;
      console.log(`【对话请求】【使用API KEY: ${this.displayKey(this.keyList[0])}】【状态：强制尝试（全部异常）】`);
      return this.keyList[0];
    }
  
    markBad(key) {
      if (key in this.keyStatus && !this.keyStatus[key].bad) {
        console.log(`【禁用KEY】API KEY: ${this.displayKey(key)}，接口返回无效（将在${BAD_KEY_RETRY_INTERVAL/60}分钟后自动重试）`);
        this.keyStatus[key].bad = true;
        this.keyStatus[key].badTs = Date.now()/1000;
      }
    }
  }
  
  // 工具函数 - 认知转换的微分方程
  function getEndpointId(openaiModel) {
    const m = String(openaiModel || "").toLowerCase().replace(" ", "");
    return MODEL_MAP[m] || DEFAULT_ONDEMAND_MODEL;
  }
  
  // 会话创建 - 建立认知连接的仪式
  async function createSession(apikey, externalUserId = null, pluginIds = null) {
    const url = `${ONDEMAND_API_BASE}/sessions`;
    const payload = { externalUserId: externalUserId || crypto.randomUUID() };
    if (pluginIds !== null) {
      payload.pluginIds = pluginIds;
    }
    
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': apikey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!resp.ok) {
        const errorText = await resp.text().catch(() => "未知错误");
        throw new Error(`创建会话失败: ${resp.status}, ${errorText}`);
      }
      
      const data = await resp.json();
      return data.data.id;
    } catch (error) {
      console.error(`【会话创建错误】: ${error.message}`);
      throw error;
    }
  }
  
  // SSE格式化 - 从一种思维形式到另一种的翻译
  function formatOpenaiSseDelta(chunkObj) {
    return `data: ${JSON.stringify(chunkObj)}\n\n`;
  }
  
  // 主要Worker处理函数 - 思维的核心处理器
  async function handleRequest(request, env) {
    // 从环境抽象中提取配置 - 一种认知的具象化
    const config = {
      // API密钥设置
      apiKey: env.OPENAI_API_KEY || "", // 从环境变量获取OpenAI兼容的API密钥
      
      // OnDemand密钥池 - 可以从环境变量覆盖默认值
      ondemandApiKeys: env.ONDEMAND_APIKEYS ? 
        JSON.parse(env.ONDEMAND_APIKEYS) : ONDEMAND_APIKEYS,
        
      // 其他配置参数
      badKeyRetryInterval: parseInt(env.BAD_KEY_RETRY_INTERVAL || BAD_KEY_RETRY_INTERVAL.toString(), 10),
      ondemandApiBase: env.ONDEMAND_API_BASE || ONDEMAND_API_BASE,
      defaultOndemandModel: env.DEFAULT_ONDEMAND_MODEL || DEFAULT_ONDEMAND_MODEL,
      
      // 调试模式
      debug: env.DEBUG_MODE === "true"
    };
    
    // 启用调试日志
    const debug = (msg, ...args) => {
      if (config.debug) {
        console.log(`[DEBUG] ${msg}`, ...args);
      }
    };
    
    // 初始化密钥管理器 - 认知资源的动态分配
    const keymgr = new KeyManager(config.ondemandApiKeys);
    
    // 请求解析 - 对输入刺激的初步感知
    const url = new URL(request.url);
    const path = url.pathname;
    
    debug(`处理请求: ${request.method} ${path}`);
    
    // 获取请求的原始URL，用于调试
    const requestUrl = request.url;
    debug(`完整请求URL: ${requestUrl}`);
    
    // 免验证路径 - 认知系统的开放区域
    const publicPaths = ["/", "/favicon.ico", "/health"];
    
    // OpenAI兼容的验证逻辑 - 一种开放而标准化的认知筛选
    if (!publicPaths.includes(path)) {
      debug("执行API密钥验证");
      
      // 提取Authorization头 - 从符号中提取意义
      const authHeader = request.headers.get("Authorization");
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        debug("验证失败: 缺少或格式错误的Authorization头");
        return new Response(
          JSON.stringify({ 
            error: {
              message: "认证错误: 缺少或格式错误的Authorization头。预期格式: 'Bearer YOUR_API_KEY'",
              type: "authentication_error",
              code: "invalid_api_key"
            }
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // 提取API密钥 - 符号与意义的分离
      const providedApiKey = authHeader.substring(7).trim();
      
      // 验证API密钥 - 认知的确认阶段
      if (providedApiKey !== config.apiKey) {
        debug("验证失败: 无效的API密钥");
        return new Response(
          JSON.stringify({ 
            error: {
              message: "无效的API密钥。请检查您的API密钥并重试。",
              type: "authentication_error",
              code: "invalid_api_key"
            }
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      debug("API密钥验证成功");
    }
    
    // 添加健康检查端点 - 系统自省的窗口
    if (path === "/health" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          environment: request.cf ? {
            colo: request.cf.colo,
            country: request.cf.country
          } : "unknown"
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 聊天完成接口 - 核心认知处理
    if (path === "/v1/chat/completions" && request.method === "POST") {
      let data;
      try {
        data = await request.json();
        debug("接收到的请求数据:", JSON.stringify(data).substring(0, 200) + "...");
      } catch (e) {
        debug("JSON解析错误:", e.message);
        return new Response(
          JSON.stringify({ error: { message: "请求体含有无效JSON", type: "invalid_request_error" } }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      if (!data || !data.messages) {
        debug("请求缺少必要字段: messages");
        return new Response(
          JSON.stringify({ error: { message: "请求缺少messages字段", type: "invalid_request_error" } }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // 提取请求参数 - 认知输入的解析
      const messages = data.messages;
      const openaiModel = data.model || "gpt-4o";
      const endpointId = getEndpointId(openaiModel);
      const isStream = Boolean(data.stream || false);
      
      debug(`模型: ${openaiModel}, 映射到: ${endpointId}, 流式模式: ${isStream}`);
      
      // 查找用户消息 - 提取交互的本质
      let userMsg = null;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          userMsg = messages[i].content;
          break;
        }
      }
      
      if (userMsg === null) {
        debug("未找到用户消息");
        return new Response(
          JSON.stringify({ error: { message: "未找到用户消息", type: "invalid_request_error" } }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // 使用有效密钥的处理逻辑 - 认知资源的智能分配
      async function withValidKey(fn) {
        let badCnt = 0;
        const maxRetry = config.ondemandApiKeys.length * 2;
        let lastError = null;
        
        debug(`开始处理请求，最大重试次数: ${maxRetry}`);
        
        while (badCnt < maxRetry) {
          const key = keymgr.get();
          try {
            debug(`尝试使用密钥: ${keymgr.displayKey(key)}`);
            return await fn(key);
          } catch (e) {
            debug(`使用密钥 ${keymgr.displayKey(key)} 时出错:`, e);
            lastError = e;
            
            const statusCode = e.status || (e.response && e.response.status);
            if (statusCode && [401, 403, 429, 500].includes(statusCode)) {
              debug(`密钥 ${keymgr.displayKey(key)} 返回错误码 ${statusCode}，标记为失效`);
              keymgr.markBad(key);
              badCnt++;
              continue;
            }
            throw e;
          }
        }
        
        debug("所有密钥都已尝试并失效");
        return new Response(
          JSON.stringify({ 
            error: { 
              message: "没有可用API KEY，请补充新KEY或联系技术支持",
              type: "server_error",
              debug_info: lastError ? (lastError.message || lastError.toString()) : null
            } 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // 流式响应处理 - 思想的连续性表达
      if (isStream) {
        debug("处理流式响应请求");
        return withValidKey(async (apikey) => {
          debug("创建OnDemand会话");
          const sid = await createSession(apikey);
          debug(`会话创建成功, ID: ${sid}`);
          
          const url = `${config.ondemandApiBase}/sessions/${sid}/query`;
          const payload = {
            query: userMsg,
            endpointId: endpointId,
            pluginIds: [],
            responseMode: "stream"
          };
          
          debug(`发送OnDemand流式请求: ${url}`);
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'apikey': apikey,
              'Content-Type': 'application/json',
              'Accept': 'text/event-stream'
            },
            body: JSON.stringify(payload)
          });
          
          if (!response.ok) {
            debug(`OnDemand API返回错误: ${response.status}`);
            throw { status: response.status, message: `OnDemand API错误: ${response.status}` };
          }
          
          // 使用TransformStream处理流式响应 - 思维流的优雅转换
          const { readable, writable } = new TransformStream();
          const writer = writable.getWriter();
          
          // 处理OnDemand的SSE并转换为OpenAI格式 - 不同思维系统间的语义翻译
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let answerAcc = "";
          let firstChunk = true;
          
          // 异步处理流 - 思维的连续性展开
          (async () => {
            try {
              debug("开始处理响应流");
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  debug("响应流结束");
                  break;
                }
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                
                for (const line of lines) {
                  if (!line.trim()) continue;
                  
                  if (line.startsWith("data:")) {
                    const datapart = line.substring(5).trim();
                    
                    if (datapart === "[DONE]") {
                      debug("收到完成标记 [DONE]");
                      await writer.write(new TextEncoder().encode("data: [DONE]\n\n"));
                      break;
                    } else if (datapart.startsWith("[ERROR]:")) {
                      const errJson = datapart.substring("[ERROR]:".length).trim();
                      debug(`收到错误: ${errJson}`);
                      await writer.write(new TextEncoder().encode(formatOpenaiSseDelta({ error: errJson })));
                      break;
                    } else {
                      try {
                        const js = JSON.parse(datapart);
                        if (js.eventType === "fulfillment") {
                          const delta = js.answer || "";
                          answerAcc += delta;
                          
                          // 构建OpenAI兼容的响应块
                          const chunk = {
                            id: "chatcmpl-" + crypto.randomUUID().substring(0, 8),
                            object: "chat.completion.chunk",
                            created: Math.floor(Date.now() / 1000),
                            model: openaiModel,
                            choices: [{
                              delta: firstChunk ? {
                                role: "assistant",
                                content: delta
                              } : {
                                content: delta
                              },
                              index: 0,
                              finish_reason: null
                            }]
                          };
                          
                          await writer.write(new TextEncoder().encode(formatOpenaiSseDelta(chunk)));
                          firstChunk = false;
                        }
                      } catch (e) {
                        debug(`解析数据块出错: ${e.message}, 数据: ${datapart.substring(0, 50)}...`);
                        continue;
                      }
                    }
                  }
                }
              }
              
              // 发送最终的完成标记
              await writer.write(new TextEncoder().encode("data: [DONE]\n\n"));
              await writer.close();
              debug("流处理完成，流已关闭");
            } catch (e) {
              debug(`流处理出错: ${e.message}`);
              await writer.abort(e);
            }
          })();
          
          return new Response(readable, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          });
        });
      }
      
      // 非流式响应处理 - 一种整体性思考的表达
      debug("处理非流式响应请求");
      return withValidKey(async (apikey) => {
        debug("创建OnDemand会话");
        const sid = await createSession(apikey);
        debug(`会话创建成功, ID: ${sid}`);
        
        const url = `${config.ondemandApiBase}/sessions/${sid}/query`;
        const payload = {
          query: userMsg,
          endpointId: endpointId,
          pluginIds: [],
          responseMode: "sync"
        };
        
        debug(`发送OnDemand同步请求: ${url}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': apikey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          debug(`OnDemand API返回错误: ${response.status}`);
          throw { status: response.status, message: `OnDemand API错误: ${response.status}` };
        }
        
        const respData = await response.json();
        const aiResponse = respData.data.answer;
        debug(`收到AI响应，长度: ${aiResponse.length}字符`);
        
        // 构建OpenAI兼容的响应格式
        const respObj = {
          id: "chatcmpl-" + crypto.randomUUID().substring(0, 8),
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: openaiModel,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: aiResponse },
              finish_reason: "stop"
            }
          ],
          usage: {
            prompt_tokens: -1, // OnDemand不提供此信息
            completion_tokens: -1,
            total_tokens: -1
          }
        };
        
        return new Response(
          JSON.stringify(respObj),
          { headers: { 'Content-Type': 'application/json' } }
        );
      });
    }
    
    // 模型列表接口 - 思维能力的自我呈现
    if (path === "/v1/models" && request.method === "GET") {
      debug("处理模型列表请求");
      const modelObjs = Object.keys(MODEL_MAP).map(mdl => ({
        id: mdl,
        object: "model",
        owned_by: "ondemand-proxy",
        created: Math.floor(Date.now() / 1000) - 86400 // 假设模型是昨天创建的
      }));
      
      // 去重并排序
      const uniq = [...new Map(modelObjs.map(m => [m.id, m])).values()];
      const sorted = uniq.sort((a, b) => a.id.localeCompare(b.id));
      
      return new Response(
        JSON.stringify({
          object: "list",
          data: sorted
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 默认响应 - 认知系统的边界反馈
    debug(`未找到路径的处理器: ${path}`);
    return new Response(
      JSON.stringify({ 
        error: { 
          message: "Not Found",
          type: "invalid_request_error"
        } 
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Worker入口点 - 思维与现实的交汇
  export default {
    async fetch(request, env, ctx) {
      try {
        return await handleRequest(request, env);
      } catch (e) {
        // 全局错误处理 - 系统的自我恢复机制
        console.error(`【全局错误】: ${e.message || e}`);
        return new Response(
          JSON.stringify({ 
            error: { 
              message: "内部服务器错误", 
              type: "server_error",
              details: e.message || String(e)
            } 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  };