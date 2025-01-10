#!/usr/bin/env python
# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Creates a rule-based user list.

The list will be defined by a combination of rules for users who have visited
two different pages of a website.
"""

import argparse
import sys
from uuid import uuid4

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException


# [START add_combined_rule_user_list]
def main(client, customer_id):
    """Creates a rule-based user list.

    The list will be defined by a combination of rules for users who have
    visited two different pages of a website.

    Args:
        client: The Google Ads client.
        customer_id: The customer ID for which to add the user list.
    """
    # Create a UserListRuleInfo object containing the first rule.
    user_visited_site1_rule_info = create_user_list_rule_info_from_url(
        client, "http://example.com/example1"
    )
    # Create a UserListRuleInfo object containing the second rule.
    user_visited_site2_rule_info = create_user_list_rule_info_from_url(
        client, "http://example.com/example2"
    )
    # Create a UserListRuleInfo object containing the third rule.
    user_visited_site3_rule_info = create_user_list_rule_info_from_url(
        client, "http://example.com/example3"
    )

    # Create the user list "Visitors of page 1 AND page 2, but not page 3".
    # To create the user list "Visitors of page 1 *OR* page 2, but not page 3",
    # change the UserListFlexibleRuleOperator from AND to OR.
    flexible_rule_user_list_info = client.get_type("FlexibleRuleUserListInfo")
    flexible_rule_user_list_info.inclusive_rule_operator = (
        client.enums.UserListFlexibleRuleOperatorEnum.AND
    )

    # Inclusive operands are joined together with the specified
    # inclusive_rule_operator. This represents the set of users that should be
    # included in the user list.
    operand_1 = client.get_type("FlexibleRuleOperandInfo")
    operand_1.rule = user_visited_site1_rule_info
    # Optionally add a lookback window for this rule, in days.
    operand_1.lookback_window_days = 7
    flexible_rule_user_list_info.inclusive_operands.append(operand_1)

    operand_2 = client.get_type("FlexibleRuleOperandInfo")
    operand_2.rule = user_visited_site2_rule_info
    # Optionally add a lookback window for this rule, in days.
    operand_2.lookback_window_days = 7
    flexible_rule_user_list_info.inclusive_operands.append(operand_2)

    # Exclusive operands are joined together with OR.
    # This represents the set of users to be excluded from the user list.
    operand_3 = client.get_type("FlexibleRuleOperandInfo")
    operand_3.rule = user_visited_site3_rule_info
    flexible_rule_user_list_info.exclusive_operands.append(operand_3)

    # Define a representation of a user list that is generated by a rule.
    rule_based_user_list_info = client.get_type("RuleBasedUserListInfo")
    # Optional: To include past users in the user list, set the
    # prepopulation_status to REQUESTED.
    rule_based_user_list_info.prepopulation_status = (
        client.enums.UserListPrepopulationStatusEnum.REQUESTED
    )
    rule_based_user_list_info.flexible_rule_user_list = (
        flexible_rule_user_list_info
    )

    # Create a user list.
    user_list_operation = client.get_type("UserListOperation")
    user_list = user_list_operation.create
    user_list.name = (
        "All visitors to http://example.com/example1 AND "
        "http://example.com/example2 but NOT "
        f"http://example.com/example3 #{uuid4()}"
    )
    user_list.description = (
        "Visitors of both http://example.com/example1 AND "
        "http://example.com/example2 but NOT"
        "http://example.com/example3"
    )
    user_list.membership_status = client.enums.UserListMembershipStatusEnum.OPEN
    user_list.rule_based_user_list = rule_based_user_list_info

    # Issue a mutate request to add the user list, then print the results.
    user_list_service = client.get_service("UserListService")
    response = user_list_service.mutate_user_lists(
        customer_id=customer_id, operations=[user_list_operation]
    )
    print(
        "Created user list with resource name: "
        f"'{response.results[0].resource_name}.'"
    )
    # [END add_combined_rule_user_list]


def create_user_list_rule_info_from_url(client, url):
    """Create a UserListRuleInfo targeting any user that visited the given URL.

    Args:
        client: The Google Ads client.
        url: a URL string.

    Returns:
        A UserListRuleInfo instance.
    """
    # Create a rule targeting any user that visited a URL that equals
    # the given url_string.
    user_visited_site_rule = client.get_type("UserListRuleItemInfo")
    # Use a built-in parameter to create a domain URL rule.
    user_visited_site_rule.name = "url__"
    user_visited_site_rule.string_rule_item.operator = (
        client.enums.UserListStringRuleItemOperatorEnum.EQUALS
    )
    user_visited_site_rule.string_rule_item.value = url

    group_info = client.get_type("UserListRuleItemGroupInfo")
    group_info.rule_items.append(user_visited_site_rule)

    # Return a UserListRuleInfo object containing the rule.
    info = client.get_type("UserListRuleInfo")
    info.rule_item_groups.append(group_info)

    return info


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Creates a combination user list containing users that are "
        "present on any one of the provided user lists."
    )
    # The following argument(s) should be provided to run the example.
    parser.add_argument(
        "-c",
        "--customer_id",
        type=str,
        required=True,
        help="The Google Ads customer ID.",
    )
    args = parser.parse_args()

    # GoogleAdsClient will read the google-ads.yaml configuration file in the
    # home directory if none is specified.
    googleads_client = GoogleAdsClient.load_from_storage(version="v18")

    try:
        main(googleads_client, args.customer_id)
    except GoogleAdsException as ex:
        print(
            f'Request with ID "{ex.request_id}" failed with status '
            f'"{ex.error.code().name}" and includes the following errors:'
        )
        for error in ex.failure.errors:
            print(f'\tError with message "{error.message}".')
            if error.location:
                for field_path_element in error.location.field_path_elements:
                    print(f"\t\tOn field: {field_path_element.field_name}")
        sys.exit(1)
