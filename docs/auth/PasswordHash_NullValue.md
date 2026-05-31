A `null` value in `users.password_hash` indicates a compromised password state.

A user with this value must be moved into the reset flow immediately. All of the user's sessions should be invalidated.

This is an intentional design decision that makes it explicit whether a password hash is valid for use.

Use `null` in `users.password_hash` when:

- the user forgot their password and wants to create a new one;
- the stored hash is damaged;
- there is suspicion that the user's password has leaked.
