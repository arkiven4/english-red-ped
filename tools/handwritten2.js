// Hand-written questions for stage 2 (course lessons 2–20). Includes the course's own practice items.
const NO = "—";
module.exports = [
 // Lesson 2 — parts of speech
 {type:"spot",topic:"adj_adv",sentence:"He speaks very good.",correct:false,wrong_word:"good.",fix:"well",fix_options:["well","goodly","best"],corrected:"He speaks very well.",explain:"Good is an adjective. To describe how someone speaks, use the adverb well."},
 {type:"fill",topic:"adj_adv",sentence:"The team ___ analyzed the research data.",options:["carefully","careful","care"],answer:"carefully",explain:"An adverb describes the verb (analyzed): carefully."},
 {type:"fill",topic:"adj_adv",sentence:"The number of students increased ___.",options:["significantly","significant","significance"],answer:"significantly",explain:"Use an adverb after a verb to describe how something changed: increased significantly."},
 {type:"fill",topic:"adj_adv",sentence:"I live in a ___ city near the capital.",options:["small","smally","smallness"],answer:"small",explain:"Use an adjective before a noun: a small city."},
 {type:"rewrite",topic:"adj_adv",wrong:"He works very hardly.",answer:"He works very hard.",explain:"Hard is already an adverb: work hard. Hardly means almost not."},
 // Lesson 3 — FANBOYS
 {type:"fill",topic:"conjunctions",sentence:"He didn't study, ___ he passed the exam.",options:["yet","so","for","or"],answer:"yet",explain:"Yet shows an unexpected contrast."},
 {type:"fill",topic:"conjunctions",sentence:"She was angry, ___ she was very hungry.",options:["for","so","nor","yet"],answer:"for",explain:"For (formal) gives a reason, like because."},
 {type:"fill",topic:"conjunctions",sentence:"Would you like tea, ___ do you prefer coffee?",options:["or","nor","so","for"],answer:"or",explain:"Or offers a choice."},
 {type:"fill",topic:"conjunctions",sentence:"He doesn't eat meat, ___ does he drink milk.",options:["nor","or","yet","for"],answer:"nor",explain:"Nor adds a second negative idea. After nor, the word order is like a question: nor does he."},
 {type:"rewrite",topic:"conjunctions",wrong:"I like play football, I don't like basketball.",answer:"I like playing football, but I don't like basketball.",alts:["I like to play football, but I don't like basketball."],explain:"Join two contrasting clauses with but. Also: like playing (or like to play)."},
 {type:"order",topic:"conjunctions",answer:"The library was closed, so we studied at home.",explain:"Compound sentence: clause + comma + so + clause."},
 {type:"order",topic:"conjunctions",answer:"I read books because they help me relax.",explain:"Complex sentence: main clause + because + reason."},
 // Lesson 4 — agreement (course items)
 {type:"fill",topic:"agreement",sentence:"My sister and her friend ___ in Jakarta.",options:["live","lives","living"],answer:"live",explain:"Two subjects joined by and are plural."},
 {type:"fill",topic:"agreement",sentence:"Everyone in the class ___ submitted their essay.",options:["has","have","having"],answer:"has",explain:"Everyone is singular, so use has."},
 {type:"fill",topic:"agreement",sentence:"Neither of the answers ___ correct.",options:["is","are","be"],answer:"is",explain:"Neither of … takes a singular verb in formal English."},
 {type:"fill",topic:"agreement",sentence:"All the students ___ waiting outside.",options:["are","is","be"],answer:"are",explain:"All the students is plural."},
 {type:"fill",topic:"agreement",sentence:"Nothing ___ impossible with practice.",options:["is","are","be"],answer:"is",explain:"Nothing is singular."},
 {type:"fill",topic:"agreement",sentence:"The number of tourists ___ increased every year.",options:["has","have","are"],answer:"has",explain:"The number of … is singular (one number). A number of … is plural."},
 {type:"fill",topic:"agreement",sentence:"A number of students ___ absent today.",options:["are","is","has"],answer:"are",explain:"A number of … means many, so it is plural."},
 // Lesson 5
 {type:"fill",topic:"pres_contrast",sentence:"The sun ___ in the east.",options:["rises","is rising","rise"],answer:"rises",explain:"General truths use the present simple."},
 {type:"fill",topic:"pres_contrast",sentence:"More students ___ abroad these days.",options:["are studying","studies","study is"],answer:"are studying",explain:"These days shows a changing trend, so use the present continuous."},
 {type:"order",topic:"pres_contrast",answer:"I'm currently preparing for the IELTS exam.",explain:"Currently = now, so use am/is/are + -ing."},
 // Lesson 6
 {type:"fill",topic:"past_cont",sentence:"I ___ when he called.",options:["was reading","read","am reading","were reading"],answer:"was reading",explain:"Longer action in progress: was/were + -ing. Short action: past simple (called)."},
 {type:"fill",topic:"past_cont",sentence:"When I was younger, I ___ football every weekend.",options:["played","was playing","play"],answer:"played",explain:"A repeated finished habit in the past uses the past simple."},
 {type:"fill",topic:"past_cont",sentence:"While she ___ dinner, the lights went out.",options:["was cooking","cooked","is cooking"],answer:"was cooking",explain:"While + past continuous for the longer background action."},
 // Lesson 7 — present continuous for the future
 {type:"fill",topic:"future",sentence:"I ___ my friend tomorrow at 10. We booked a table.",options:["am meeting","meet","met"],answer:"am meeting",explain:"For an arranged plan with a time, use the present continuous: I'm meeting."},
 {type:"fill",topic:"future",sentence:"I think it ___ tomorrow.",options:["will rain","rains","is raining now"],answer:"will rain",explain:"For a prediction (I think…), use will."},
 {type:"fill",topic:"future",sentence:"I'm ___ apply for a scholarship next year. I have already decided.",options:["going to","will","go to"],answer:"going to",explain:"For a plan you already decided, use be going to."},
 {type:"rewrite",topic:"future",wrong:"I am going to continue my studies after graduation, I think it is will be fun.",answer:"I am going to continue my studies after graduation, and I think it will be fun.",explain:"Don't put is before will: it will be. Join the two clauses with and."},
 // Lesson 8
 {type:"fill",topic:"pres_perfect",sentence:"I have known her ___ 2010.",options:["since","for","from"],answer:"since",explain:"Since + a starting point (2010)."},
 {type:"fill",topic:"pres_perfect",sentence:"I saw him ___.",options:["last week","since Monday","for two days"],answer:"last week",explain:"Past simple goes with a finished time like last week."},
 {type:"rewrite",topic:"pres_perfect",wrong:"I have not ate since yesterday.",answer:"I have not eaten since yesterday.",alts:["I haven't eaten since yesterday."],explain:"After have, use the past participle: eat → ate → eaten."},
 {type:"rewrite",topic:"pres_perfect",wrong:"Barra have eaten a burger.",answer:"Barra has eaten a burger.",explain:"One person takes has: Barra has eaten."},
 // Lesson 9
 {type:"rewrite",topic:"relative",wrong:"The teacher is kind, she helped me with my essay.",answer:"The teacher who helped me with my essay is kind.",alts:["The teacher, who is kind, helped me with my essay."],explain:"Join the ideas with who instead of two sentences glued with a comma."},
 {type:"rewrite",topic:"relative",wrong:"The book is on the table. It belongs to Sarah.",answer:"The book which is on the table belongs to Sarah.",alts:["The book that is on the table belongs to Sarah.","The book, which is on the table, belongs to Sarah.","The book on the table belongs to Sarah."],explain:"Use which (or that) to join the two sentences."},
 {type:"order",topic:"relative",answer:"The book, which was written in 1990, has become a classic.",explain:"Extra information about a thing: comma + which + clause + comma."},
 // Lesson 10
 {type:"fill",topic:"conditionals",sentence:"If I ___ harder, I would have passed.",options:["had studied","studied","have studied","would study"],answer:"had studied",explain:"Third conditional: If + had + past participle, would have + past participle."},
 {type:"order",topic:"conditionals",answer:"If I wake up late, I will miss the bus.",explain:"First conditional: If + present simple, will + base verb."},
 {type:"order",topic:"conditionals",answer:"If I'm late for class, my teacher will be angry.",explain:"First conditional: If + present simple, will + base verb."},
 // Lesson 11 + 20
 {type:"fill",topic:"passive",sentence:"The cake ___ in the oven at 180 degrees.",options:["is baked","bakes","is baking","baked"],answer:"is baked",explain:"Describing a process: present passive (is + past participle)."},
 {type:"fill",topic:"passive",sentence:"A new product ___ by the company next year.",options:["will be launched","will launch","is launched","launched"],answer:"will be launched",explain:"Future passive: will be + past participle."},
 {type:"fill",topic:"passive_adv",sentence:"The dinner ___ by the chef right now.",options:["is being prepared","is preparing","has prepared","prepares"],answer:"is being prepared",explain:"Passive continuous: is being + past participle."},
 {type:"fill",topic:"passive_adv",sentence:"A new strategy ___ by experts.",options:["has been developed","has developed","is developing","develops"],answer:"has been developed",explain:"Passive perfect: has been + past participle."},
 {type:"fill",topic:"passive_adv",sentence:"The manager had the report ___ by the assistant.",options:["prepared","prepare","preparing","to prepare"],answer:"prepared",explain:"Causative: have + object + past participle."},
 {type:"fill",topic:"passive_adv",sentence:"The results ___ tomorrow.",options:["will be announced","will announce","are announcing","announced"],answer:"will be announced",explain:"Future passive: will be + past participle."},
 // Lesson 12
 {type:"fill",topic:"the_zero",sentence:"___ sun rises in the east.",options:["The","A",NO],answer:"The",explain:"There is only one sun, so use the."},
 {type:"fill",topic:"the_zero",sentence:"I am going to ___ university next year.",options:[NO,"the","a"],answer:NO,explain:"Go to university / school / work / bed (to study, learn, work, sleep): no article."},
 {type:"fill",topic:"the_zero",sentence:"She has ___ wisdom to succeed.",options:[NO,"the","a"],answer:NO,explain:"Wisdom is uncountable and general here: no article."},
 {type:"fill",topic:"the_zero",sentence:"___ information is power.",options:[NO,"The","An"],answer:NO,explain:"Information in general: uncountable, no article."},
 {type:"fill",topic:"the_zero",sentence:"I saw ___ book on the table.",options:["a","the",NO],answer:"a",explain:"First mention of one book (any book): a."},
 {type:"fill",topic:"the_zero",sentence:"Can you pass me ___ salt, please?",options:["the","a",NO],answer:"the",explain:"Both people know which salt (the one on the table): the."},
 {type:"fill",topic:"the_zero",sentence:"Jakarta is ___ capital of Indonesia.",options:["the","a",NO],answer:"the",explain:"A country has only one capital: the capital."},
 {type:"fill",topic:"the_zero",sentence:"She plays ___ piano very well.",options:["the","a",NO],answer:"the",explain:"Musical instruments take the: play the piano."},
 {type:"fill",topic:"the_zero",sentence:"He plays ___ football every Sunday.",options:[NO,"the","a"],answer:NO,explain:"Sports take no article: play football."},
 {type:"rewrite",topic:"the_zero",wrong:"I am going to a university.",answer:"I am going to university.",explain:"Go to university (to study): no article."},
 // Lesson 13
 {type:"fill",topic:"quantifiers",sentence:"There are ___ people in the meeting.",options:["many","much"],answer:"many",explain:"People is countable: many."},
 {type:"fill",topic:"quantifiers",sentence:"He has very ___ money, so he can't buy a car.",options:["little","few","many"],answer:"little",explain:"Money is uncountable: little (not few)."},
 {type:"fill",topic:"quantifiers",sentence:"There is ___ work to do.",options:["much","many","few"],answer:"much",explain:"Work is uncountable: much."},
 {type:"fill",topic:"quantifiers",sentence:"She has ___ experience in teaching.",options:["a lot of","many","a few"],answer:"a lot of",explain:"Experience (skill) is uncountable: a lot of or much, not many."},
 {type:"rewrite",topic:"quantifiers",wrong:"I need some advices about my essay.",answer:"I need some advice about my essay.",explain:"Advice is uncountable: no -s."},
 // Lesson 14
 {type:"rewrite",topic:"linking",wrong:"People like fast food. It is unhealthy.",answer:"Although fast food is unhealthy, people like it.",alts:["People like fast food. However, it is unhealthy.","People like fast food although it is unhealthy.","People like fast food, but it is unhealthy.","Even though fast food is unhealthy, people like it.","People like fast food even though it is unhealthy."],explain:"Show the contrast with although, even though, however or but."},
 {type:"fill",topic:"linking",sentence:"I like coffee, ___ she prefers tea.",options:["whereas","therefore","moreover"],answer:"whereas",explain:"Whereas compares two different facts in one sentence."},
 {type:"fill",topic:"linking",sentence:"The course was expensive. ___, it was worth it.",options:["However","Therefore","Moreover"],answer:"However",explain:"However shows contrast."},
 // Lesson 15
 {type:"rewrite",topic:"parallel",wrong:"She likes to dance, singing, and to cook.",answer:"She likes to dance, to sing, and to cook.",alts:["She likes dancing, singing, and cooking.","She likes to dance, sing, and cook.","She likes dancing, singing and cooking.","She likes to dance, to sing and to cook."],explain:"Items in a list need the same form."},
 // Lesson 16
 {type:"rewrite",topic:"demonstratives",wrong:"Online education is popular. Online education is convenient.",answer:"Online education is popular. It is also convenient.",alts:["Online education is popular. It is convenient.","Online education is popular. This is convenient.","Online education is popular, and it is convenient."],explain:"Use it (or this) to avoid repeating the noun."},
 {type:"rewrite",topic:"demonstratives",wrong:"Pollution is increasing. Pollution affects health.",answer:"Pollution is increasing. It affects health.",alts:["Pollution is increasing. This affects health.","Pollution is increasing, and it affects health."],explain:"Use it (or this) to avoid repeating the noun."},
 // Lesson 17
 {type:"rewrite",topic:"collocations",wrong:"We discussed about the problem.",answer:"We discussed the problem.",alts:["We talked about the problem."],explain:"Discuss takes no preposition: discuss something. (Talk about something.)"},
 {type:"rewrite",topic:"collocations",wrong:"She is married with a doctor.",answer:"She is married to a doctor.",explain:"Married to, not married with."},
 {type:"fill",topic:"collocations",sentence:"I'm good ___ playing the piano.",options:["at","in","on","for"],answer:"at",explain:"Good at + skill."},
 {type:"fill",topic:"prepositions",sentence:"I will arrive ___ 10 a.m.",options:["at","on","in"],answer:"at",explain:"Clock times take at."},
 {type:"fill",topic:"prepositions",sentence:"She lives ___ Paris.",options:["in","at","on"],answer:"in",explain:"Cities take in."},
 {type:"fill",topic:"prepositions",sentence:"I am ___ the bus stop.",options:["at","in","on"],answer:"at",explain:"A specific point or location: at the bus stop."},
 // Lesson 18
 {type:"fill",topic:"superlatives",sentence:"Today is the ___ day of the week.",options:["hottest","hotest","most hot","hotter"],answer:"hottest",explain:"Hot → hotter → hottest: double the t."},
 {type:"fill",topic:"comparatives",sentence:"This course is ___ than the other one.",options:["more interesting","interestinger","most interesting","more interestinger"],answer:"more interesting",explain:"Long adjectives use more: more interesting."},
 // Lesson 19
 {type:"fill",topic:"gerund_inf",sentence:"I enjoy ___ books in my free time.",options:["reading","to read","read"],answer:"reading",explain:"Enjoy + -ing."},
 {type:"fill",topic:"gerund_inf",sentence:"She plans ___ to Japan next year.",options:["to travel","traveling","travel"],answer:"to travel",explain:"Plan + to + base verb."},
 {type:"rewrite",topic:"gerund_inf",wrong:"I like to playing soccer.",answer:"I like playing soccer.",alts:["I like to play soccer."],explain:"Like + -ing or like + to + base verb. Never to + -ing."},
 {type:"rewrite",topic:"gerund_inf",wrong:"He decided to studying French.",answer:"He decided to study French.",explain:"Decide + to + base verb."},
];
