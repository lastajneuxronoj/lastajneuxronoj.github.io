const fs = require("fs/promises");
const path = require("path");

const {
    POSTS_JSON_PATH,
    NEWSLETTERS_JSON_PATH,
    NEWSLETTER_DIR,
    TRANSLATIONS_JSON_PATH,
    SITE_URL,
    SITE_NAME
} = require("./config");

const {
    loadTemplate,
    renderTemplate
} = require("./utils/template");


async function buildNewsletters() {

    const translations =
        JSON.parse(
            await fs.readFile(
                TRANSLATIONS_JSON_PATH,
                "utf8"
            )
        );


    const newsletters =
        JSON.parse(
            await fs.readFile(
                NEWSLETTERS_JSON_PATH,
                "utf8"
            )
        );


    const buildAll =
        process.argv.includes("--all");


    function t(lang, key) {

        return (
            key
                .split(".")
                .reduce(
                    (obj, part) =>
                        obj?.[part],
                    translations[lang]
                )
            ??
            ""
        );
    }


    const posts =
        JSON.parse(
            await fs.readFile(
                POSTS_JSON_PATH,
                "utf8"
            )
        );


    const template =
        await loadTemplate(
            "newsletter.html"
        );


    await fs.mkdir(
        NEWSLETTER_DIR,
        { recursive: true }
    );


    function renderAvailableLanguages(post, lang) {

        const languages =
            Object.keys(post.file ?? {});


        if (languages.length <= 1) {
            return "";
        }


        const labels =
            languages
                .map(code =>
                    `[${code.toUpperCase()}]`
                )
                .join(" ");


        return `

<p
style="
    margin-top:15px;
    color:#666666;
    font-size:13px;
">

${t(
    lang,
    "newsletter.availableLanguages"
)}

<br>

<span style="
    font-weight:bold;
    letter-spacing:0.08em;
">

${labels}

</span>

</p>

`;
    }


    function renderPodcast(post, lang) {

        const podcast =
            (post.podcast ?? [])
                .find(item =>
                    item.lang === lang
                );


        if (!podcast) {
            return "";
        }


        return `

<p
style="
    margin-top:15px;
">

<a
href="${podcast.url}"
style="
    display:inline-block;
    padding:8px 14px;
    background:#1DB954;
    color:#ffffff;
    text-decoration:none;
    border-radius:6px;
    font-size:14px;
">

${t(
    lang,
    "newsletter.listen"
)}

</a>

</p>

`;
    }


    const newslettersToBuild =
        buildAll
            ? newsletters
            : [newsletters.at(-1)];


    for (const newsletter of newslettersToBuild) {

        if (!newsletter) {
            console.log(
                "No se encontraron newsletters para generar."
            );
            return;
        }


        const selectedPosts =
            posts.filter(post =>
                (
                    newsletter.posts ?? []
                ).includes(
                    post.number
                )
            );


        let newsletterLanguages =
            [
                ...new Set(
                    selectedPosts.flatMap(post =>
                        Object.keys(
                            post.file ?? {}
                        )
                    )
                )
            ];
        
        
        if (newsletterLanguages.length === 0) {
        
            if (
                newsletter.message &&
                typeof newsletter.message === "object"
            ) {
            
                newsletterLanguages =
                    Object.keys(
                        newsletter.message
                    );
                
            } else {
            
                newsletterLanguages = ["eo"];
            
            }
        }


        for (const lang of newsletterLanguages) {


            const postsHtml =
                selectedPosts
                    .filter(post =>
                        post.file?.[lang]
                    )
                    .map(post => {


                        const title =
                            post.title?.[lang] ??
                            "";


                        const excerpt =
                            post.excerpt?.[lang] ??
                            "";


                        const languages =
                            renderAvailableLanguages(
                                post,
                                lang
                            );


                        const podcast =
                            renderPodcast(
                                post,
                                lang
                            );


                        const postUrl =
                            `${SITE_URL}blog/${post.number}-${lang}.html`;


                        const coverUrl =
                            `${SITE_URL}${post.cover}`;


                        const readMoreText =
                            t(
                                lang,
                                "newsletter.readMore"
                            );


                        return `

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
    margin-top:30px;
    border:1px solid #dddddd;
    border-radius:10px;
">

<tr>

<td
style="
    padding:20px;
">

<img
src="${coverUrl}"
alt="${title}"
style="
    width:100%;
    max-width:560px;
    border-radius:8px;
    display:block;
">


<h2
style="
    font-size:24px;
    margin-top:20px;
    color:#111111;
">

${title}

</h2>


<p
style="
    line-height:1.6;
    color:#333333;
">

${excerpt}

</p>


${languages}


<a
href="${postUrl}"
style="
    display:inline-block;
    margin-top:10px;
    padding:10px 18px;
    background:#EEE;
    color:#000;
    text-decoration:none;
    border-radius:6px;
">

${readMoreText}

</a>


${podcast}


</td>

</tr>

</table>

`;

                    })
                    .join("");


            const messageHtml =

                newsletter.message

        ? (

            typeof newsletter.message === "object"

                ? (
                    newsletter.message[lang]
                    ??
                    newsletter.message.eo
                    ??
                    ""
                )

                : newsletter.message

        )

        : "";
            

            const html =
                renderTemplate(
                    template,
                    {

                        lang,


                        title:
                            newsletter.title?.[lang] ??
                            newsletter.title ??
                            "",


                        newsletter_title:
                            newsletter.title?.[lang] ??
                            newsletter.title ??
                            "",


                        logo:
                            `${SITE_URL}images/logo.png`,


                        site_name:
                            SITE_NAME,


                        date:
                            newsletter.date ?? "",


                        intro:
                            newsletter.intro?.[lang] ??
                            t(
                                lang,
                                "newsletter.intro"
                            ),


                        language_notice:
                            t(
                                lang,
                                "newsletter.languageNotice"
                            ),


                        posts:
                            postsHtml + messageHtml,


                        outro:
                            newsletter.outro?.[lang] ??
                            t(
                                lang,
                                "newsletter.outro"
                            ),


                        flag:
                            `${SITE_URL}svg/flag_eo.svg`

                    }
                );


            const fileName =
                `${newsletter.id
                    .toString()
                    .padStart(3, "0")
                }-${lang}.html`;


            await fs.writeFile(
                path.join(
                    NEWSLETTER_DIR,
                    fileName
                ),
                html
            );


            console.log(
                `✓ Newsletter ${newsletter.id}-${lang} generado`
            );
        }
    }
}


buildNewsletters().catch(console.error);