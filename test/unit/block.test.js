import { blockClass } from "../../src/vm/extensions/block/index.js";

describe("blockClass", () => {
    const runtime = {
        formatMessage: function (msg) {
            return msg.default;
        }
    };

    test("should create an instance of blockClass", () => {
        const block = new blockClass(runtime);
        expect(block).toBeInstanceOf(blockClass);
    });

    test("frequencyDomainMin should return 0 when analyser is not initialized", () => {
        const block = new blockClass(runtime);
        const result = block.frequencyDomainMin();
        expect(result).toBe(0);
    });
});
