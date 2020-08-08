import 'dotenv-defaults/config';
import {Bot} from '@wireapp/bot-api';
import {Prompt, WizardHandler} from '../WizardHandler';

const {EMAIL, PASSWORD} = process.env;

const bot = new Bot({
  email: EMAIL!,
  password: PASSWORD!,
});

interface AddUserProps {
  age: number;
  firstName: string;
  lastName: string;
}

const questionnaire: Prompt<string | number>[] = [
  {
    answerKey: 'firstName',
    answerValue: (firstName: string): string => firstName,
    question: `What's your first name?`,
    response: 'Ok.',
  },
  {
    answerKey: 'lastName',
    answerValue: (lastName: string): string => lastName,
    question: `What's your last name?`,
    response: 'Nice to meet you.',
  },
  {
    answerKey: 'age',
    answerValue: (age: string): number => {
      const ageValue = parseInt(age, 10);
      if (!ageValue) {
        throw Error(`I'm sorry. I did not understand that. Please enter a valid number.`);
      }
      return ageValue;
    },
    question: `Would you mind telling me your age?`,
    response: 'Thank you.',
  },
];

const onFinish = (user: AddUserProps, conversationId: string, userId: string) => {
  bot
    .sendText(conversationId, `Hello "${user.firstName} ${user.lastName}", your user ID is "${userId}".`)
    .catch(console.error);
};

const addUserWizard = new WizardHandler<AddUserProps>('/add user', questionnaire, onFinish);
bot.addHandler(addUserWizard);

async function main() {
  await bot.start();
}

main().catch(console.error);
