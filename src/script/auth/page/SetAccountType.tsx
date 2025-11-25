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

import {Navigate, useNavigate} from 'react-router-dom';

import {Runtime} from '@wireapp/commons';
import {Button, ButtonVariant, CheckRoundIcon, FlexBox} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {Page} from './Page';
import {styles} from './SetAccountType.styles';

import {Config} from '../../Config';
import {BackButton} from '../component/BackButton';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {ROUTE} from '../route';
import {pathWithParams} from '../util/urlUtil';

export const SetAccountType = () => {
  const navigate = useNavigate();

  const onCreatePersonalAccount = () => {
    navigate(ROUTE.CREATE_ACCOUNT);
  };

  const onCreateTeamAccount = () => {
    window.open(EXTERNAL_ROUTE.WIRE_TEAMS_SIGNUP, '_blank');
  };

  if (!Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION) {
    return <Navigate to={pathWithParams(ROUTE.INDEX)} replace data-uie-name="redirect-login" />;
  }

  const isMacDesktopApp = Runtime.isDesktopApp() && Runtime.isMacOS();

  const accountTypeOptions = [
    {
      heading: t('selectTeamAccountTypeOptionHeading'),
      description: t('selectTeamAccountTypeOptionDescription'),
      buttonText: t('selectTeamAccountTypeOptionButtonText'),
      action: onCreateTeamAccount,
      features: [
        t('selectTeamAccountTypeOptionFeature1'),
        ...(!isMacDesktopApp ? [t('selectTeamAccountTypeOptionFeature2')] : []),
      ],
      isPrimary: true,
    },
    {
      heading: t('selectPersonalAccountTypeOptionHeading'),
      description: t('selectPersonalAccountTypeOptionDescription'),
      buttonText: t('selectPersonalAccountTypeOptionButtonText'),
      features: [
        t('selectPersonalAccountTypeOptionFeature1'),
        ...(!isMacDesktopApp ? [t('selectPersonalAccountTypeOptionFeature2')] : []),
      ],
      action: onCreatePersonalAccount,
    },
  ];

  return (
    <Page withSideBar>
      <FlexBox css={styles.container}>
        <FlexBox css={styles.header}>
          <FlexBox css={styles.headerIcon}>
            <BackButton />
          </FlexBox>
          <FlexBox css={styles.headerText} role="heading" aria-level={1} data-page-title tabIndex={-1}>
            {t('selectAccountTypeHeading')}
          </FlexBox>
        </FlexBox>
        <FlexBox css={styles.optionWrapper}>
          {accountTypeOptions.map((option, index) => (
            <AccountTypeOption
              key={index}
              heading={option.heading}
              description={option.description}
              buttonText={option.buttonText}
              action={option.action}
              features={option.features}
              isPrimary={option.isPrimary}
            />
          ))}
        </FlexBox>
      </FlexBox>
    </Page>
  );
};

interface AccountTypeOptionProps {
  heading: string;
  description: string;
  buttonText: string;
  action: () => void;
  features: string[];
  isPrimary?: boolean;
}

const AccountTypeOption = ({action, buttonText, description, heading, features, isPrimary}: AccountTypeOptionProps) => {
  return (
    <FlexBox data-uie-name="account-type-option" css={styles.optionContainer(isPrimary)}>
      <div css={styles.option}>
        <p css={styles.optionHeading}>{heading}</p>
        <p css={styles.optionDescription}>{description}</p>
        <div css={styles.featureList}>
          <div css={styles.horizontalLine} />
          {features.map((feature, index) => (
            <>
              <FlexBox key={index} css={styles.optionFeatureContainer}>
                <CheckRoundIcon css={styles.featureIcon} />
                <p css={styles.featureText}>{feature}</p>
              </FlexBox>
              <div css={styles.horizontalLine} />
            </>
          ))}
        </div>
        <Button
          data-uie-name="select-account-type-button"
          onClick={action}
          css={styles.optionButton}
          variant={isPrimary ? ButtonVariant.PRIMARY : ButtonVariant.SECONDARY}
        >
          {buttonText}
        </Button>
      </div>
    </FlexBox>
  );
};
