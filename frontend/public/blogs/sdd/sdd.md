## Challenges of Spec-Driven Development in 2025

October 22, 2025

I define *spec-driven development* as working with AI to generate 'spec' or 'plan' files which lay out how a new feature (to be implemented by AI in code) should behave.  Checkout this [video](https://youtu.be/nkDfUobnxH0?si=zIoADLmgIUy6skVB) I made to see it in action.

While spec-driven development is an improvement from rogue vibe-coding, it still carries the same costs associated with vibe-coding.

> Spec-driven development is vibe-coding with guardrails.

Although spec-driven development can very useful for starting a project from scratch or adding unit tests, these two use cases account for ~5% of a project's lifecycle.  The remaining 95% is **maintaining** and **extending** code with new features, which requires a deep understanding of a codebase to perform well.

Having used spec-driven development with AI to implement several features, I've experienced two issues that have made it harder to maintain and extend my codebase:
1. it adds unnecessary complexity
2. it distances the developer from the code, thus lowering comprehension

##### Increased Code Complexity

In software engineering, there's a balance between planning for the future (extensibility via abstraction) vs. just building exactly what you need (i.e. a specific class with hard-coded fields).  I've noticed that AI (in spec-driven development mode) leans heavily towards the abstraction side of things.

While it's good to think ahead to the future, it's often hard to predict what the future will require of our codebase, especially for startups that must adapt and pivot often.  

For example, I used spec-driven development to add magic-code auth to my codebase and the AI created a class-hierarchy to support multiple types of authentication when all I needed was a `MagicCodeToken` class for magic-code auth.

I've also used spec-driven development to implement a Stripe integration and after repeatedly trying to convince it of a simpler way (and subsequently finding that simpler way reading the Stripe documentation myself (*gasp!*)) it implemented a more complex solution than what I needed (embedded checkout vs. a simpler Stripe-hosted checkout).

Spec-driven development makes it much easier to over-engineer solutions, which has a real cost to the developer since they have to spend resources on maintaining the unnecessary complexity instead of building new value into their product.

>Don't build something until you absolutely need it, you can always refactor later once you know you need it.

Even worse than having to maintain complex code is having to maintain complex code you don't understand because you didn't write it.

##### Reduced Developer Comprehension

The act of writing code (or anything) oneself reinforces understanding.

> In my experience, comprehension is much stronger from writing a line of code myself vs. reading a line of AI-generated code

This mismatch in comprehension is the distance that spec-driven development has created between the developer and code.

Deploying large features written by AI with spec-driven development is like presenting a book report written by someone else - sure, you might get away with it but things will break once your comprehension is questioned.

Once a bug occurs in production, it will take twice as long to understand AI-generated code vs. code written oneself.  And if the bug is urgent/time-sensitive, the negative effects are pronounced.

Because AI-generated code is harder for the developer to fully understand, it's also harder to update or remove due to fear of breaking something.  AI-generated code can feel like a field of landmines in the codebase and it's unnerving to know there's production code running that you don't fully understand.

When a developer doesn't write code themselves, they forfeit the opportunity to build the context knowledge necessary to recall why something was built in a certain way, which is crucial for developing and debugging code.

AI is getting better at understanding context, but it still doesn't have the same level of context and knowledge of a codebase as the developer.

##### Conclusion

Spec-driven development results in unnecessarily complex code and cheats the developer of building deeper comprehension.  This makes it challenging for the developer to maintain and further develop their codebase.

After several projects where I've fallen down the slippery slope of spec-driven development, I've stopped using this approach along with AI-coding assistants.

However, I still heavily use AI to answer my specific questions by copying/pasting code snippets into ChatGPT, Claude, and Gemini.  I just don't let it write my code for me in my IDE.

My thoughts will probably change as AI gets better and I learn new ways of interacting with it, but for now in 2025, this is my approach and what works for me.