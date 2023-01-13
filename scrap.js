const puppeteer = require("puppeteer")
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

let scrape = async() => { //cria função assinc para fazer o scraping
    const browser = await puppeteer.launch( {headless: false,}) //cria browser cm visualização

    const page = await browser.newPage(); //cria uma nova aba no navegador

    await page.setViewport({ //pede pra pág ser aberta em tela cheia HD
        width: 1366,
        height: 768,
        deviceScaleFactor: 1,
    })

    await page.goto("http://www2.decom.ufop.br/terralab/posts/?category=all") // seta a pág p navegador acessar

    let haveNext = false; //flag para decidir se existe uma próxima página ou não
    let links = [] // vetor para armazenar todos os links coletados 

    do {
        haveNext = false; // a flag vai para falso sempre ao entrar no loop
        const urls = await page.$$eval("article > div > a", (el) => {
            return el.map((a) => a.getAttribute("href"));
        }); //checagem pelas urls dessa página 

        links = links.concat(urls); //concatena o resultado dessa página com as demais
        
        // se o elemento existir:
        const button_next_page = await page.$("ul.page-numbers > li > a.next.page-numbers");

        if (button_next_page) { // aguarda pelo término da execução das duas funções antes de prosseguir
            await Promise.all(
                [
                    page.waitForNavigation(),  //espera que a navegação entre as páginas tenha terminado
                    page.$eval("ul.page-numbers > li > a.next.page-numbers", e => e.click()) // encontra a seta com eval e clica no elemento
                ]
            );
            haveNext = true; // caso tenha encontrado a seta, a flag vira true e o loop é retomado
        }
    } while (haveNext);

    const posts = []; // vetor que armazena as postagens 

    for(const url of links) {
        await page.goto(url); //caminha para a url
        await page.waitForSelector("div.entry-content > div"); //espera até que o texto esteja disponível 

        const title = await page.$eval("div.header-callout > section > div > div > div > h3", (title) => title.innerText); // seleciona o elemento que contém o titulo e retorna o texto dele
        const image = await page.$eval("header > a > img", (image) => image.getAttribute("src")); // seleciona o elemento da imagem e busca o atributo src que contem o url dela

        const content = await page.$eval("div.entry-content > div", el => el.innerText); //seleciona o conteúdo da postagem e pega o texto desse elemento

        const post = {
            title,
            image,
            content
        }; //cria objeto com as informações 

        posts.push(post); // adiciona objeto ao vetor
    }
    
    browser.close(); // fecha o browser
    
    return posts;
};

scrape()
.then ((value) => { //espera async terminar e exibe erro se não der certo
   const csvWriter = createCsvWriter({    //cria o arquivo e adiciona um header com os titulos das colunas e atribui a constante csvWriter
        path: "file.csv",
        header: [
            { id: "title", title: "Titulo" },
            { id: "image", title: "Imagem" },
            { id: "content", title: "Conteudo" }, 
        ],
    }); 
    // salva no arquivo acima os valores recebidos 
    csvWriter
    .writeRecords(value) //retorna uma promise
    .then (() => {
        console.log("Feito");
    });
    
})
.catch((error) => console.log(error));
