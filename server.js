import express from "express";
import { sql } from "@vercel/postgres";
import bodyParser from "body-parser";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import pgSimple from "connect-pg-simple"; // NECESSÁRIO PARA LOGIN NA VERCEL

// --- CONFIGURAÇÃO PARA ES MODULES ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const pgSession = pgSimple(session); // INICIALIZA O STORE DA SESSÃO

// --- CONFIGURAÇÕES DO SISTEMA ---
const SENHA_ADMIN = "admin123"; 
const DATA_SORTEIO = "2026-03-30"; 
const NOME_BEBE = "Ester";

// --- LISTA DE VERSÍCULOS ---
const VERSICULOS = [
    { texto: "Os filhos são herança do Senhor, uma recompensa que ele dá.", ref: "Salmos 127:3" },
    { texto: "Antes de formá-lo no ventre eu o escolhi; antes de você nascer, eu o separei.", ref: "Jeremias 1:5" },
    { texto: "Por este menino orava eu; e o Senhor concedeu-me a petição que eu lhe fiz.", ref: "1 Samuel 1:27" },
    { texto: "Toda boa dádiva e todo dom perfeito vêm do alto.", ref: "Tiago 1:17" },
    { texto: "Ensina a criança no caminho em que deve andar, e, ainda quando for velho, não se desviará dele.", ref: "Provérbios 22:6" },
    { texto: "Tu criaste o íntimo do meu ser e me teceste no ventre de minha mãe.", ref: "Salmos 139:13" },
    { texto: "O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti.", ref: "Números 6:24-25" },
    { texto: "Como pastor ele cuida de seu rebanho, com o braço ajunta os cordeiros e os carrega no colo.", ref: "Isaías 40:11" },
    { texto: "Deixem vir a mim as crianças e não as impeçam; pois o Reino dos céus pertence aos que são semelhantes a elas.", ref: "Mateus 19:14" },
    { texto: "Não tenho maior alegria do que ouvir que meus filhos estão andando na verdade.", ref: "3 João 1:4" },
    { texto: "Honra teu pai e tua mãe, para que tenhas vida longa na terra que o Senhor, o teu Deus, te dá.", ref: "Êxodo 20:12" },
    { texto: "Pais, não irritem seus filhos; antes criem-nos segundo a instrução e o conselho do Senhor.", ref: "Efésios 6:4" },
    { texto: "Filhos, obedeçam a seus pais no Senhor, pois isso é justo.", ref: "Efésios 6:1" },
    { texto: "Os pais não devem acumular para os filhos, mas os filhos para os pais.", ref: "2 Coríntios 12:14" },
    { texto: "Corrige teu filho, e ele te dará descanso; dará delícias à tua alma.", ref: "Provérbios 29:17" },
    { texto: "A estultícia está ligada ao coração da criança, mas a vara da disciplina a afastará dela.", ref: "Provérbios 22:15" },
    { texto: "O filho sábio dá alegria ao pai; o filho tolo é a tristeza da mãe.", ref: "Provérbios 10:1" },
    { texto: "O que teme ao Senhor possui uma fortaleza segura, refúgio para os seus filhos.", ref: "Provérbios 14:26" },
    { texto: "Os filhos dos filhos são uma coroa para os idosos, e os pais são o orgulho dos seus filhos.", ref: "Provérbios 17:6" },
    { texto: "Quem poupa a vara odeia o filho, mas quem o ama, cedo o disciplina.", ref: "Provérbios 13:24" },
    { texto: "Tragam os filhos e os ensinem a obedecer às palavras deste Livro da Lei.", ref: "Deuteronômio 32:46" },
    { texto: "Repita continuamente essas palavras aos seus filhos. Fale delas em casa e na estrada.", ref: "Deuteronômio 6:7" },
    { texto: "E todos os teus filhos serão ensinados pelo Senhor, e grande será a paz de teus filhos.", ref: "Isaías 54:13" }
];

// --- MIDDLEWARES ---
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

// IMPORTANTE: Confiar no Proxy da Vercel (HTTPS)
app.set('trust proxy', 1);

app.use(session({
    store: new pgSession({
        conString: process.env.POSTGRES_URL, // Usa a URL do banco da Vercel
        createTableIfMissing: true // Cria a tabela de sessão automaticamente
    }),
    secret: "chave-secreta-do-cha-da-ester",
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
        secure: true, // OBRIGATÓRIO NA VERCEL (HTTPS)
        httpOnly: true,
        sameSite: 'none' // Importante para mobile/cross-site
    } 
}));

// --- ROTA DE CRIAÇÃO DO BANCO (EXECUTAR UMA VEZ) ---
app.get("/setup-db", async (req, res) => {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS escolhas (
                id SERIAL PRIMARY KEY,
                numero INTEGER UNIQUE,
                nome TEXT,
                telefone TEXT,
                fralda TEXT,
                data TIMESTAMP DEFAULT NOW()
            );
        `;
        return res.send("Tabelas verificadas com sucesso! (Tabela 'session' criada automaticamente pelo plugin).");
    } catch (error) {
        return res.status(500).json({ error });
    }
});

// --- ROTAS DO SISTEMA ---

app.get("/", async (req, res) => {
    try {
        const { rows } = await sql`SELECT numero, nome FROM escolhas`;
        const ocupados = rows.map(r => r.numero);
        const ocupadosNomes = {};
        rows.forEach(row => { ocupadosNomes[row.numero] = row.nome.split(' ')[0]; });
        const progresso = Math.round((ocupados.length / 300) * 100);
        
        res.render("index", { ocupados, ocupadosNomes, progresso, nomeBebe: NOME_BEBE });
    } catch (err) {
        console.error(err);
        res.render("index", { ocupados: [], ocupadosNomes: {}, progresso: 0, nomeBebe: NOME_BEBE });
    }
});

app.post("/registrar", async (req, res) => {
    const { numero, nome, telefone, fralda } = req.body;
    const versiculoSorteado = VERSICULOS[Math.floor(Math.random() * VERSICULOS.length)];

    try {
        await sql`INSERT INTO escolhas (numero, nome, telefone, fralda, data) VALUES (${numero}, ${nome}, ${telefone}, ${fralda}, NOW())`;
        res.render("mensagem", { 
            titulo: "Sucesso!", 
            msg: `Você garantiu o número ${numero} para o Chá da ${NOME_BEBE}! Obrigado por participar!`,
            tipo: "sucesso",
            versiculo: versiculoSorteado
        });
    } catch (err) {
        if (err.code === '23505') {
            return res.render("mensagem", { titulo: "Ops!", msg: `O número ${numero} já foi escolhido por outra pessoa.`, tipo: "erro", versiculo: null });
        }
        console.error(err);
        return res.render("mensagem", { titulo: "Erro", msg: "Erro interno", tipo: "erro", versiculo: null });
    }
});

// --- LOGIN & ADMIN ---
app.get("/login", (req, res) => res.render("login"));

app.post("/login", (req, res) => {
    const { senha } = req.body;
    if (senha === SENHA_ADMIN) {
        req.session.admin = true;
        // Força salvar no banco antes de redirecionar
        req.session.save(err => {
            if(err) console.log(err);
            res.redirect("/admin");
        });
    } else {
        res.render("login", { erro: "Senha incorreta!" });
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

app.get("/admin", async (req, res) => {
    if (!req.session.admin) return res.redirect("/login");
    try {
        const { rows } = await sql`SELECT * FROM escolhas ORDER BY numero`;
        res.render("admin", { itens: rows });
    } catch (err) {
        console.error(err);
        // Agora mostra o erro REAL na tela
        res.status(500).send("Erro detalhado do Banco: " + err.message);
    }
});

// --- SORTEIO ---
app.get("/sortear", async (req, res) => {
    const hoje = new Date().toISOString().split("T")[0]; 
    if (hoje < DATA_SORTEIO) {
       const dataFormatada = DATA_SORTEIO.split('-').reverse().join('/');
       return res.render("mensagem", { titulo: "Aguarde o Grande Dia!", msg: `O sorteio será realizado apenas no dia <b>${dataFormatada}</b>.`, tipo: "erro", versiculo: null });
    }
    try {
        const { rows } = await sql`SELECT * FROM escolhas`;
        if (!rows || rows.length === 0) return res.render("mensagem", { titulo: "Lista Vazia", msg: "Ninguém participou da rifa ainda.", tipo: "erro", versiculo: null });
        const sorteado = rows[Math.floor(Math.random() * rows.length)];
        res.render("resultado", { sorteado });
    } catch (err) {
        res.send("Erro no sorteio");
    }
});

export default app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => {
        console.log("Servidor rodando em: http://localhost:3000");
    });
}