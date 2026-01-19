Feature: Onboarding Password Creation

  Background:
    Given the app is launched

  @onboarding @password @setup
  Scenario: User can see setup password screen
    Given user is on the Create Password setup screen
    Then user can see "Create a password" title
    And user can see setup password description
    And user can see padlock icon
    And user can see "Add a password" button
    And user can see "Set up later" button on password screen
    And user can see "Skip" button on password screen

  @onboarding @password @setup
  Scenario: User can navigate to password creation form from Add a password button
    Given user is on the Create Password setup screen
    When user taps "Add a password" button
    Then user is on the Password creation screen
    And user can see "Create password" input field
    And user can see "Confirm password" input field
    And user can see "Create a hint (optional)" input field
    And user can see "Create password" button
    And user can see "Symbol guide" link

  @onboarding @password @validation
  Scenario: Password criteria are hidden until user starts typing
    Given user is on the Password creation screen
    And password form is cleared
    Then password criteria are not visible
    When user types first character in password field
    Then password criteria become visible
    And user can see password strength indicator

  @onboarding @password @validation
  Scenario Outline: Password criteria are struck out when met
    Given user is on the Password creation screen
    And password form is cleared
    And user has started typing a password
    When user enters password "<password>"
    Then <criteria> criteria is struck out
    Examples:
      | password      | criteria  |
      | password123   | length    |
      | password123   | lowercase |
      | Password123   | uppercase |
      | Abcdef!@1     | number    |
      | Abc1234!      | symbol    |

  @onboarding @password @validation @boundary
  Scenario Outline: User can create password with boundary length values
    Given user is on the Password creation screen
    And password form is cleared
    When user enters password "<password>"
    And user enters confirm password "<password>"
    And user taps "Create password" button
    Then password is created successfully
    And user navigates to the next screen after password creation
    Examples:
      | password                                                                              | description |
      | Pass123!                                                                              | minimum (8) |
      | Pass12345678901234567890123456789012345678901234567890123456789!                     | maximum (64) |

  @onboarding @password @validation @error
  Scenario Outline: User sees validation error messages for invalid passwords
    Given user is on the Password creation screen
    And password form is cleared
    When user enters password "<password>"
    Then user can see "<errorMessage>" error message
    Examples:
      | password                                                          | errorMessage                                                         |
      | 1234567asdwer@#$3FSvcvxzvxvfas4af4afavbns2adfasfs4wfsagsfssfewfa2 | Must contain between 8-64 characters                                 |
      | 1234567                                                           | Must contain between 8-64 characters                                 |
      | !a345678                                                          | Must contain an uppercase letter                                     |
      | !A345678                                                          | Must contain a lowercase letter                                      |
      | 12345678Qw                                                        | Must contain a valid symbol                                         |
      | !Aasdfgq                                                          | Must contain a number                                                |
      | Abc@12344∞                                                        | Use only lowercase/uppercase letters, numbers & symbols for your password. |

  @onboarding @password @strength
  Scenario Outline: User can see password strength indicator
    Given user is on the Password creation screen
    And password form is cleared
    When user enters password "<password>"
    Then user can see "<strength>" strength indicator
    Examples:
      | password            | strength |
      | weak123             | Weak     |
      | Medium123           | Medium   |
      | StrongP@ssw0rd123!  | Strong   |

  @onboarding @password @visibility
  Scenario: User can toggle password and confirm password visibility
    Given user is on the Password creation screen
    And password form is cleared
    And user has entered matching passwords
    When user taps eye icon on password field
    Then password is visible
    When user taps eye icon again
    Then password is hidden
    When user taps eye icon on confirm password field
    Then confirm password is visible
    When user taps eye icon again on confirm password
    Then confirm password is hidden

  @onboarding @password @symbol-guide
  Scenario: User can open symbol guide modal
    Given user is on the Password creation screen
    And password form is cleared
    When user taps "Symbol guide" link
    Then symbol guide modal is displayed
    And user can see symbol guide table
    When user closes symbol guide modal
    Then symbol guide modal is closed

  @onboarding @password @validation
  Scenario: Create password button is disabled until passwords match
    Given user is on the Password creation screen
    And password form is cleared
    Then "Create password" button is disabled
    When user enters password "ValidP@ss123!"
    Then "Create password" button is still disabled
    When user enters confirm password "ValidP@ss123!"
    Then "Create password" button is enabled

  @onboarding @password @validation @error @symbol-guide
  Scenario: User sees "Learn more" link and can open symbol guide
    Given user is on the Password creation screen
    And password form is cleared
    When user enters password "12345678Qw"
    Then user can see "Must contain a valid symbol" error message
    And user can see "Learn more" link
    When user taps "Learn more" link
    Then symbol guide modal is displayed
    When user closes symbol guide modal
    Then symbol guide modal is closed

  @onboarding @password @validation @error
  Scenario: User sees password mismatch error and can fix it
    Given user is on the Password creation screen
    And password form is cleared
    When user enters password "ValidP@ss123!"
    And user enters confirm password "Different123!"
    Then user sees "Passwords do not match" error
    And "Create password" button is disabled
    When user enters confirm password "ValidP@ss123!"
    Then password mismatch error is cleared
    And "Create password" button is enabled

  @onboarding @password @hint
  Scenario: User can create password with hint
    Given user is on the Password creation screen
    And password form is cleared
    When user enters password "StrongP@ssw0rd123!"
    And user enters confirm password "StrongP@ssw0rd123!"
    And user enters hint "My favorite color"
    And user taps "Create password" button
    Then password is created successfully
    And user navigates to the next screen after password creation

  @onboarding @password @hint
  Scenario: User can create password without hint
    Given user is on the Password creation screen
    And password form is cleared
    When user enters password "StrongP@ssw0rd123!"
    And user enters confirm password "StrongP@ssw0rd123!"
    And user taps "Create password" button
    Then password is created successfully
    And user navigates to the next screen after password creation

  @onboarding @password @hint @error
  Scenario: User sees hint error and can fix it
    Given user is on the Password creation screen
    And password form is cleared
    When user enters password "StrongP@ssw0rd123!"
    And user enters confirm password "StrongP@ssw0rd123!"
    And user enters hint "My password is StrongP@ssw0rd123!"
    Then user sees "Your hint cannot be your password" error
    And "Create password" button is disabled
    When user enters hint "My favorite color"
    Then hint error is cleared
    And "Create password" button is enabled

  @onboarding @password @skip
  Scenario: User can skip password creation
    Given user is on the Create Password setup screen
    When user taps "Set up later" button
    Then user sees skip password confirmation alert
    When user confirms skip password
    Then user navigates to the next screen

  @onboarding @password @skip
  Scenario: User can cancel skipping password creation
    Given user is on the Create Password setup screen
    When user taps "Set up later" button
    Then user sees skip password confirmation alert
    When user cancels skip password
    Then user remains on Create Password setup screen

  @onboarding @password @skip
  Scenario: User can skip password creation from Skip button
    Given user is on the Password creation screen
    When user taps "Skip" button
    Then user sees skip password confirmation alert
    When user confirms skip password
    Then user navigates to the next screen


