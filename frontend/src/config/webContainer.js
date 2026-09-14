import { WebContainer } from '@webcontainer/api';

// WebContainer.boot() may only be called once per page. Cache the promise
// (not the resolved instance) so concurrent callers during boot share the
// same boot instead of starting a second one, which throws.
let bootPromise = null;

export const getWebContainer = () => {
    if (!bootPromise) {
        bootPromise = WebContainer.boot().catch((err) => {
            bootPromise = null;
            throw err;
        });
    }
    return bootPromise;
};
