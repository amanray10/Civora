const prisma = require('../config/prisma');
const { chatbotReply } = require('../services/aiService');

// POST /api/chat  { question }
exports.ask = async (req,res) => {
  let {question} = req.body;
  if (!question?.trim()) return res.status(400).json({error: "Type a question first."});

  try{
    let history = await prisma.chatHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { timestamp: 'desc' }, take: 5
    });

    let answer = await chatbotReply(question.trim(), history.reverse());
    let saved = await prisma.chatHistory.create({
      data: { userId: req.user.id, question: question.trim(), answer: answer }
    });

    console.log("chat saved:", saved.id);
    res.json({chat: saved});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while getting a reply."});
  }
};

// GET /api/chat/history
exports.history = async (req,res) => {
  try{
    let chats = await prisma.chatHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { timestamp: 'asc' }, take: 100
    });

    res.json({chats: chats});

  } catch (err){
    console.log(err);
    res.status(500).json({error: "Error occurred while fetching chat history."});
  }
};
