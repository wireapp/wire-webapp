/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {
  Bold,
  Column,
  Columns,
  Container,
  H1,
  H2,
  H3,
  H4,
  Heading,
  Large,
  Lead,
  Line,
  Muted,
  Paragraph,
  Small,
  Text,
  Title,
  Uppercase,
} from '@wireapp/react-ui-kit';
import React from 'react';

export const DemoTypography = () => (
  <Container>
    <Line />
    <H1>Typography</H1>
    <Line />
    <Columns>
      <Column>Title</Column>
      <Column>
        <Title>Title</Title>
      </Column>
    </Columns>
    <Columns>
      <Column>Default heading</Column>
      <Column>
        <Heading>Heading default</Heading>
      </Column>
    </Columns>
    <Columns>
      <Column>Heading1</Column>
      <Column>
        <H1>Heading1</H1>
      </Column>
    </Columns>
    <Columns>
      <Column>Heading2</Column>
      <Column>
        <H2>Heading2</H2>
      </Column>
    </Columns>
    <Columns>
      <Column>Heading3</Column>
      <Column>
        <H3>Heading3</H3>
      </Column>
    </Columns>
    <Columns>
      <Column>Heading4</Column>
      <Column>
        <H4>Heading4</H4>
      </Column>
    </Columns>

    <Columns>
      <Column>Unformatted text</Column>
      <Column>Unformatted text</Column>
    </Columns>
    <Columns>
      <Column>Normal text</Column>
      <Column>
        <Text>Normal text</Text>
      </Column>
    </Columns>
    <Columns>
      <Column>Bold text</Column>
      <Column>
        <Bold>Bold text</Bold>
      </Column>
    </Columns>
    <Columns>
      <Column>Muted text</Column>
      <Column>
        <Muted>Muted text</Muted>
      </Column>
    </Columns>
    <Columns>
      <Column>Small text</Column>
      <Column>
        <Small>Small text</Small>
      </Column>
    </Columns>
    <Columns>
      <Column>Uppercase text</Column>
      <Column>
        <Uppercase>upper case</Uppercase>
      </Column>
    </Columns>
    <Columns>
      <Column>Large text</Column>
      <Column>
        <Large>Large text</Large>
      </Column>
    </Columns>
    <Line />
    <H2>Paragraph</H2>
    <Paragraph>
      Lorem ipsum dolor, sit amet consectetur adipisicing elit. Odit, nemo. Voluptates rerum harum accusamus dignissimos
      modi rem, quod quia. Delectus nesciunt, provident rerum maiores vero consequatur, nostrum quod ad, ipsam
      reprehenderit iure laborum error amet voluptate aliquam cum! Error nulla nobis, quia beatae nesciunt ex doloribus
      eius temporibus nihil explicabo eveniet architecto, ipsam doloremque. Pariatur, reiciendis voluptatem? Modi
      voluptatibus fugiat aliquid, ipsum quisquam corrupti labore molestiae optio, voluptate iste incidunt laborum ullam
      obcaecati veniam harum deleniti nobis beatae aspernatur inventore in, quibusdam sunt itaque ipsam veritatis!
      Inventore corporis eaque voluptatum quaerat facilis illo architecto unde consequatur veniam modi nam, eveniet
      perferendis aliquid in deleniti! Officiis obcaecati repudiandae harum sequi. Eum ab qui, eaque sapiente, quod
      perspiciatis totam voluptate neque enim facere repudiandae nemo! Soluta sunt aliquid voluptatem molestiae fugiat,
      iure iste assumenda, non quia nisi voluptatibus odio perferendis qui debitis facere dignissimos perspiciatis
      sapiente laborum voluptatum. Quia provident aperiam id veniam natus inventore distinctio, error, quibusdam nulla
      iusto maxime! Necessitatibus quo vitae veritatis repellat unde placeat tempora est nobis aut cumque quis, autem,
      quae maiores nihil consectetur quasi? Error repudiandae similique adipisci quasi autem necessitatibus labore
      cumque, exercitationem consequuntur fugiat nemo aliquam, architecto animi inventore explicabo sint iure molestias
      laborum.
    </Paragraph>
    <Line />
    <H2>Truncated text</H2>
    <Paragraph noWrap truncate>
      Lorem ipsum dolor sit amet consectetur adipisicing elit. Ut at eveniet numquam non aperiam, provident sed atque
      quibusdam! Vitae velit tempore ea pariatur voluptatum. Iure dolorum laudantium, rem iusto eveniet obcaecati
      perspiciatis. Dolorem quisquam laborum ab ipsam unde eum rerum incidunt quia magnam harum itaque, obcaecati fugiat
      debitis aliquid nihil, voluptatum commodi, sit quidem! Delectus itaque consectetur consequatur quis dignissimos
      pariatur, incidunt ipsam in velit deleniti voluptatum numquam minima. Optio repudiandae deleniti nemo modi,
      eligendi sit rem? Sapiente facere quam laboriosam ratione tenetur inventore repellendus adipisci dolorem sit vero
      cum explicabo consequatur voluptatibus quis modi fuga mollitia, maiores expedita dolor nostrum magni nesciunt
      cupiditate. Itaque voluptatibus totam asperiores quisquam nisi nihil, eos accusantium similique, praesentium illo
      neque repellendus nam placeat. Quibusdam minima repudiandae blanditiis iste esse voluptas in! Cumque distinctio
      consequatur animi sit incidunt nostrum aut mollitia, voluptatum dolores reprehenderit eius qui praesentium
      officiis delectus, non neque, cupiditate quis obcaecati recusandae odit? Minus officiis sed, nemo quos in
      laudantium consequatur soluta accusamus ea adipisci magni consequuntur optio incidunt eligendi, rerum cupiditate
      repudiandae tempore dolores neque laborum commodi, libero voluptatibus dolorum! Magnam perferendis alias porro,
      placeat totam molestiae similique reiciendis harum consequuntur, earum autem excepturi expedita molestias laborum
      quae non cupiditate!
    </Paragraph>
    <H2>Lead</H2>
    <Lead>
      Lorem ipsum dolor sit amet consectetur adipisicing elit. Ut at eveniet numquam non aperiam, provident sed atque
      quibusdam! Vitae velit tempore ea pariatur voluptatum. Iure dolorum laudantium, rem iusto eveniet obcaecati
      perspiciatis. Dolorem quisquam laborum ab ipsam unde eum rerum incidunt quia magnam harum itaque, obcaecati fugiat
      debitis aliquid nihil, voluptatum commodi, sit quidem!
    </Lead>
  </Container>
);
