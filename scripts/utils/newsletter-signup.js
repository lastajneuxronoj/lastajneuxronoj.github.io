function renderNewsletterSignup(lang) {

    if (lang !== "eo") {
        return "";
    }

    return `

<section class="newsletter-signup">

    <h2>
        📬 Abonu al la bulteno
    </h2>

    <p>
        Ricevu sciigon kiam aperas novaj artikoloj de Lastaj Neŭronoj.
    </p>

    <form
        action="https://buttondown.com/api/emails/embed-subscribe/lastajneuxronoj"
        method="post"
        class="embeddable-buttondown-form"
    >

        <label for="bd-email">
            Retpoŝto:
        </label>

        <input
            type="email"
            name="email"
            id="bd-email"
            required
        >

        <input
            type="submit"
            value="Aboni"
            id="newsletter-submit"
        >

    </form>
    <p class="newsletter-powered">
    Bulteno liverata per
        <a
            href="https://buttondown.com/refer/lastajneuxronoj"
            target="_blank"
            rel="noopener noreferrer"
        >
            Buttondown
        </a>
    </p>
</section>

`;
}


module.exports = {
    renderNewsletterSignup
};