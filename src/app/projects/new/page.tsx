"use client";

import React, { useState, useEffect } from "react";
import { 
  Typography, 
  Form, 
  Input, 
  Button, 
  Card, 
  DatePicker, 
  Switch, 
  Row, 
  Col, 
  Skeleton, 
  App 
} from "antd";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface ProjectFormValues {
  companyName: string;
  contactPerson: string;
  email: string;
  dashboard: boolean;
  webApp: boolean;
  androidApp: boolean;
  iosApp: boolean;
  adminPanel: boolean;
  extraAddOns: string;
  timeline: any;
}

export default function NewProjectPage() {
  const [form] = Form.useForm<ProjectFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [mounting, setMounting] = useState(true);
  
  const { message } = App.useApp();

  // Fake a loading state on mount (400ms) to display our pristine skeleton UX
  useEffect(() => {
    const timer = setTimeout(() => setMounting(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const onFinish = async (values: ProjectFormValues) => {
    setSubmitting(true);

    try {
      const response = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        message.success("Project created successfully!");
        form.resetFields();
      } else {
        message.error(data.error || "Failed to create project");
      }
    } catch (error) {
      console.error(error);
      message.error("Something went wrong. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  // Custom Validator binding ContactPerson -> Email dependencies securely
  const contactValidator = () => ({
    validator(_: any, value: string) {
      if (form.getFieldValue('contactPerson') || form.getFieldValue('email')) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('Providing either a Contact Person or Email is required!'));
    },
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <Title level={3} style={{ margin: 0 }}>Client Project</Title>
        <Text type="secondary">Detail the project specifications thoroughly for the pipeline processing.</Text>
      </div>

      <Skeleton active loading={mounting} paragraph={{ rows: 20 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          initialValues={{
            dashboard: false,
            webApp: false,
            androidApp: false,
            iosApp: false,
            adminPanel: false,
          }}
        >
          <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 24 }}>1. Client Details</Title>
            <Row gutter={24}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="companyName"
                  label={<span style={{ fontWeight: 500 }}>Company Name</span>}
                  rules={[{ required: true, message: "Please enter the company name" }]}
                >
                  <Input size="large" placeholder="E.g., Acme Corp" />
                </Form.Item>
              </Col>
              
              <Col xs={24} md={8}>
                {/* Contact Person triggers a re-validation of email dependency */}
                <Form.Item
                  name="contactPerson"
                  label={<span style={{ fontWeight: 500 }}>Contact Person</span>}
                  dependencies={['email']}
                  rules={[contactValidator]}
                >
                  <Input size="large" placeholder="E.g., Jane Doe" />
                </Form.Item>
              </Col>
              
              <Col xs={24} md={8}>
                <Form.Item
                  name="email"
                  label={<span style={{ fontWeight: 500 }}>Contact Email</span>}
                  dependencies={['contactPerson']}
                  rules={[
                    { type: "email", message: "Please enter a valid email address" },
                    contactValidator
                  ]}
                >
                  <Input size="large" placeholder="jane@acme.com" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 8 }}>2. Application Features</Title>
            <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
              Toggle the requested feature sets below.
            </Text>
            
            <Row gutter={[24, 24]}>
              <Col xs={12} sm={8} md={4}>
                <Form.Item name="dashboard" valuePropName="checked" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Text style={{ fontWeight: 500 }}>Dashboard</Text>
                    <Switch />
                  </div>
                </Form.Item>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Form.Item name="webApp" valuePropName="checked" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Text style={{ fontWeight: 500 }}>Web App</Text>
                    <Switch />
                  </div>
                </Form.Item>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Form.Item name="androidApp" valuePropName="checked" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Text style={{ fontWeight: 500 }}>Android App</Text>
                    <Switch />
                  </div>
                </Form.Item>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Form.Item name="iosApp" valuePropName="checked" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Text style={{ fontWeight: 500 }}>iOS App</Text>
                    <Switch />
                  </div>
                </Form.Item>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Form.Item name="adminPanel" valuePropName="checked" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Text style={{ fontWeight: 500 }}>Admin Panel</Text>
                    <Switch />
                  </div>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card variant="borderless" style={{ borderRadius: 12, marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 24 }}>3. Details & Logistics</Title>
            
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="timeline"
                  label={<span style={{ fontWeight: 500 }}>Project Timeline</span>}
                  rules={[{ required: true, message: "A timeline is required" }]}
                >
                  <RangePicker size="large" style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="extraAddOns"
              label={<span style={{ fontWeight: 500 }}>Extra Add-ons & Notes</span>}
            >
              <TextArea 
                rows={5} 
                placeholder="Are there any custom third-party integrations needed (e.g., Stripe, SendGrid)?" 
                size="large"
              />
            </Form.Item>
          </Card>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 16 }}>
            <Button size="large" onClick={() => form.resetFields()}>
              Clear Form
            </Button>
            <Button type="primary" htmlType="submit" size="large" loading={submitting} style={{ padding: "0 32px" }}>
              Create Project
            </Button>
          </div>
        </Form>
      </Skeleton>
    </div>
  );
}
