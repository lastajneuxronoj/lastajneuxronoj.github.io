function renderNewsletterSignup(lang, translations) {

    const text = translations[lang].ui.push;

    const capitalizeLanguageName = name =>
    name
        ? name.charAt(0).toLocaleUpperCase() + name.slice(1)
        : name;

    if (lang !== "eo" && lang !== "es") {
        return "";
    }

    return `

<section class="newsletter-signup">

    <h2>
        📬 ${text.newsletterTitle}
    </h2>

    <p>
        ${text.newsletterDescription}
    </p>

    <form
        action="https://buttondown.com/api/emails/embed-subscribe/lastajneuxronoj"
        method="post"
        class="embeddable-buttondown-form"
    >

        <label for="bd-email">
            ${text.newsletterEmail}
        </label>

        <input
            type="email"
            name="email"
            id="bd-email"
            required
        >

        <label>
    ${text.newsletterPreferredLanguage}
</label>

<div class="push-language-selector newsletter-language-selector">

    <button
        type="button"
        class="push-language-button"
        aria-haspopup="listbox"
        aria-expanded="false"
    >
        <img
            src="/svg/flag_${lang}.svg"
            alt=""
            class="push-language-flag"
            aria-hidden="true"
        >
        <span>${capitalizeLanguageName(text[lang])}</span>
        <span class="push-language-arrow" aria-hidden="true">▾</span>
    </button>

    <div
        class="push-language-menu"
        role="listbox"
        hidden
    >
        ${["eo", "es"].map(language => `
            <button
                type="button"
                class="push-language-option"
                role="option"
                data-language="${language}"
                aria-selected="${language === lang}"
            >
                <img
                    src="/svg/flag_${language}.svg"
                    alt=""
                    class="push-language-flag"
                    aria-hidden="true"
                >
                <span>${capitalizeLanguageName(text[language])}</span>
            </button>
        `.trim()).join("\n")}
    </div>

    <input
        type="hidden"
        name="metadata__language"
        value="${lang}"
        id="newsletter-language"
    >

</div>

        <input
            type="submit"
            value="${text.newsletterSubscribe}"
            id="newsletter-submit"
        >

    </form>

    <p class="newsletter-powered">
        ${text.newsletterPowered}
        <a
            class="buttondown"
            href="https://buttondown.com/refer/lastajneuxronoj"
            target="_blank"
            rel="noopener noreferrer"
        >Buttondown</a>.
    </p>

</section>

`;
}


module.exports = {
    renderNewsletterSignup
};