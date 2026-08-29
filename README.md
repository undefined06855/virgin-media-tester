# Virgin Media Tester

A simple server that allows testing of network faults for a certain house, knowing the postcode and surname.

You should set the following environment variables:
```env
PORT=8080                   # The port to host this on
VIRGIN_MEDIA_POSTCODE=      # Your house's postcode
VIRGIN_MEDIA_SURNAME=       # The surname of the account holder
```

And this provides an endpoint `/status`, that when fetched, will fetch the (anonymised) error messages from Virgin
Media.

To run, run `bun i` then `bun main`.

This project was created using `bun init` in bun v1.4.0. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
