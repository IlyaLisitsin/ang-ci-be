function Response({ errorMessage, data }) {
    if (!errorMessage) error = null;
    if (!data) data = null;
    this.errorMessage = errorMessage;
    this.data = data;
}

module.exports = Response;
