async function message(context, req) {
    let name = req.query.name || 'World';
    if (req.body && req.body.name) {
        name = req.body.name;
    }

    context.res = {
        body : `Hello ${name}`
    };
}

module.exports = message;
