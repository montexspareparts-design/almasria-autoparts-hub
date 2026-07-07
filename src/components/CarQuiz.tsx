import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, CheckCircle2, XCircle, Trophy, RotateCcw, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Question {
  question: string;
  options: string[];
  correct: number;
  fact: string;
}

const QUESTIONS: Question[] = [
  {
    question: "كل كام كيلو لازم تغير زيت المحرك؟",
    options: ["كل 3,000 كم", "كل 5,000 كم", "كل 10,000 كم", "كل 20,000 كم"],
    correct: 1,
    fact: "تغيير الزيت كل 5,000 كم يحافظ على عمر المحرك ويحسن الأداء 🛢️",
  },
  {
    question: "إيه وظيفة فلتر الهواء في السيارة؟",
    options: ["تبريد المحرك", "تنقية الهواء الداخل للمحرك", "زيادة السرعة", "تقليل الضوضاء"],
    correct: 1,
    fact: "فلتر الهواء النظيف يحسن كفاءة الوقود بنسبة تصل لـ 10% 💨",
  },
  {
    question: "إيه الفرق بين فرامل القرص وفرامل الطبلة؟",
    options: ["مفيش فرق", "القرص أقوى في التبريد", "الطبلة أغلى", "القرص أرخص"],
    correct: 1,
    fact: "فرامل القرص بتبرد أسرع وبتوقف العربية بكفاءة أعلى 🛑",
  },
  {
    question: "ماركة DENSO أصلها من أنهي بلد؟",
    options: ["ألمانيا", "أمريكا", "اليابان", "كوريا"],
    correct: 2,
    fact: "DENSO يابانية وهي من أكبر موردي قطع غيار السيارات في العالم 🇯🇵",
  },
  {
    question: "إيه اللي بيحصل لو سخونة المحرك عالية أوي؟",
    options: ["بيزود القوة", "ممكن يسبب تلف الجوان", "بيوفر وقود", "مفيش تأثير"],
    correct: 1,
    fact: "السخونة الزيادة ممكن تأثر على جوان كوبري وتسبب أعطال كبيرة 🌡️",
  },
  {
    question: "كل كام كيلو تغير شمعات الإشعال (البوجيهات)؟",
    options: ["كل 1,000 كم", "كل 5,000 كم", "كل 30,000 كم", "مش محتاجة تتغير"],
    correct: 2,
    fact: "البوجيهات الجديدة بتحسن حرق الوقود وبتقلل الانبعاثات ⚡",
  },
  {
    question: "AISIN متخصصة في إنتاج إيه؟",
    options: ["الإطارات", "ناقل الحركة والفتيس", "الزجاج", "البوية"],
    correct: 1,
    fact: "AISIN من أكبر مصنعي ناقلات الحركة الأوتوماتيك في العالم ⚙️",
  },
  {
    question: "إيه أفضل نوع زيت لمحركات تويوتا الحديثة؟",
    options: ["زيت معدني", "زيت شبه صناعي", "زيت صناعي بالكامل", "أي زيت"],
    correct: 2,
    fact: "الزيت الصناعي بيوفر حماية أفضل في درجات الحرارة العالية 🏆",
  },
];

const CarQuiz = () => {
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [quizQuestions] = useState(() => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  });

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === quizQuestions[currentQ].correct) {
      setScore((s) => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= quizQuestions.length) {
      setFinished(true);
    } else {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const restart = () => {
    setStarted(false);
    setCurrentQ(0);
    setSelected(null);
    setScore(0);
    setAnswered(false);
    setFinished(false);
  };

  const getScoreMessage = () => {
    const pct = (score / quizQuestions.length) * 100;
    if (pct === 100) return { text: "خبير سيارات حقيقي! 🏆", emoji: "🎯" };
    if (pct >= 60) return { text: "معلوماتك كويسة جدًا! 👏", emoji: "⭐" };
    if (pct >= 40) return { text: "محتاج تعرف أكتر! 📚", emoji: "💡" };
    return { text: "تابعنا عشان تتعلم أكتر! 🚀", emoji: "🔧" };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="bg-card border border-border rounded-xl p-6 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="relative z-10">
        {/* Start Screen */}
        {!started && !finished && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4"
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block mb-3"
            >
              <Car className="w-12 h-12 text-primary mx-auto" />
            </motion.div>
            <h3 className="text-xl font-black text-foreground mb-2">
              اختبر معلوماتك! 🚗
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              5 أسئلة سريعة عن السيارات وقطع الغيار - هل أنت خبير؟
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => setStarted(true)}
                size="lg"
                className="gap-2 red-glow font-bold"
              >
                <Zap className="w-5 h-5" />
                ابدأ الكويز!
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Quiz in progress */}
        {started && !finished && (
          <div>
            {/* Progress bar */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-muted-foreground">
                سؤال {currentQ + 1} من {quizQuestions.length}
              </span>
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary">{score}</span>
              </div>
            </div>
            <div className="w-full h-2 bg-muted rounded-full mb-5 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQ + 1) / quizQuestions.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Question */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <h4 className="font-bold text-foreground text-base mb-4 leading-relaxed">
                  {quizQuestions[currentQ].question}
                </h4>

                <div className="space-y-2">
                  {quizQuestions[currentQ].options.map((opt, idx) => {
                    const isCorrect = idx === quizQuestions[currentQ].correct;
                    const isSelected = idx === selected;

                    let borderClass = "border-border hover:border-primary/40";
                    let bgClass = "bg-card hover:bg-primary/5";

                    if (answered) {
                      if (isCorrect) {
                        borderClass = "border-green-500";
                        bgClass = "bg-green-500/10";
                      } else if (isSelected && !isCorrect) {
                        borderClass = "border-destructive";
                        bgClass = "bg-destructive/10";
                      } else {
                        borderClass = "border-border opacity-50";
                        bgClass = "bg-card";
                      }
                    }

                    return (
                      <motion.button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        disabled={answered}
                        className={`w-full text-right p-3 rounded-lg border ${borderClass} ${bgClass} transition-all duration-200 flex items-center gap-3`}
                        whileHover={!answered ? { scale: 1.02 } : {}}
                        whileTap={!answered ? { scale: 0.98 } : {}}
                      >
                        <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground">
                          {["أ", "ب", "ج", "د"][idx]}
                        </span>
                        <span className="text-sm font-medium text-foreground flex-1">{opt}</span>
                        {answered && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        )}
                        {answered && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Fact after answering */}
                <AnimatePresence>
                  {answered && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/15 text-sm text-muted-foreground"
                    >
                      <span className="font-bold text-foreground">💡 هل تعلم؟ </span>
                      {quizQuestions[currentQ].fact}
                    </motion.div>
                  )}
                </AnimatePresence>

                {answered && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4"
                  >
                    <Button onClick={nextQuestion} className="w-full gap-2">
                      {currentQ + 1 < quizQuestions.length ? "السؤال التالي →" : "شوف النتيجة 🏆"}
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Results */}
        {finished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6 }}
              className="text-5xl mb-3"
            >
              {getScoreMessage().emoji}
            </motion.div>
            <h3 className="text-xl font-black text-foreground mb-1">
              {getScoreMessage().text}
            </h3>
            <div className="text-3xl font-black text-primary mb-2">
              {score}/{quizQuestions.length}
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              {score >= 3
                ? "أنت فاهم سيارات كويس! تابعنا عشان تعرف أكتر 🚗"
                : "تابع صفحتنا عشان تتعلم أكتر عن صيانة عربيتك 🔧"}
            </p>

            <div className="flex gap-3 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={restart} variant="outline" className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  جرب تاني
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild className="gap-2 red-glow">
                  <a href="https://wa.me/201034806288" target="_blank" rel="noopener noreferrer">
                    <Sparkles className="w-4 h-4" />
                    تواصل معانا
                  </a>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default CarQuiz;
